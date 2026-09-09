// Unit test: the 401 → refresh → retry base query, with emphasis on single-flight.
//
// Refresh tokens rotate with reuse detection, so a SECOND concurrent refresh presents a token the
// first one already burned and gets the whole family revoked. Concurrency here is a correctness
// requirement, not a performance detail — hence the concurrent-401 case below.
//
// The redirect is injected, so this file asserts only that the hook FIRES. What an app does with
// it is the app's test to write — @digitaltwin/api has no opinion about where a dead session sends
// someone.
import { beforeEach, describe, expect, it, vi } from "vitest";

const raw = vi.hoisted(() => vi.fn());

vi.mock("@reduxjs/toolkit/query/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reduxjs/toolkit/query/react")>()),
  fetchBaseQuery: () => raw,
}));

const { createReauthBaseQuery } = await import("./rtk");

const REFRESH_PATH = "/auth/refresh";

let onAuthFailure = vi.fn();
let baseQueryWithReauth = createReauthBaseQuery({
  baseUrl: "/api",
  refreshPath: REFRESH_PATH,
  onAuthFailure,
});

type Args = Parameters<typeof baseQueryWithReauth>;
const extra = {} as Args[2];

// Each caller carries its own abort signal, exactly as RTK Query gives one per query.
const callerApi = (signal: AbortSignal) => ({ signal }) as unknown as Args[1];
const api = callerApi(new AbortController().signal);

const isRefresh = (args: unknown) =>
  typeof args === "object" && args !== null && "url" in args
    ? (args as { url: string }).url === REFRESH_PATH
    : false;

const call = (url: string) => baseQueryWithReauth({ url }, api, extra);

beforeEach(() => {
  raw.mockReset();
  // A fresh base query per test: the single-flight state is per instance, and the
  // "later 401 starts a fresh refresh" case is only meaningful against a clean one.
  onAuthFailure = vi.fn();
  baseQueryWithReauth = createReauthBaseQuery({
    baseUrl: "/api",
    refreshPath: REFRESH_PATH,
    onAuthFailure,
  });
});

describe("createReauthBaseQuery", () => {
  it("passes a successful query straight through without refreshing", async () => {
    raw.mockResolvedValue({ data: ["ok"] });

    const result = await call("users");

    expect(result).toEqual({ data: ["ok"] });
    expect(raw).toHaveBeenCalledTimes(1);
  });

  it("refreshes once on 401 and retries the original query", async () => {
    raw
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ data: { refreshed: true } })
      .mockResolvedValueOnce({ data: ["after-refresh"] });

    const result = await call("users");

    expect(result).toEqual({ data: ["after-refresh"] });
    expect(raw.mock.calls.filter(([args]) => isRefresh(args))).toHaveLength(1);
  });

  it("sends only ONE refresh when several queries 401 at the same time", async () => {
    let refreshes = 0;
    let refreshed = false;
    raw.mockImplementation(async (args: unknown) => {
      if (isRefresh(args)) {
        refreshes += 1;
        // Rotation is not instant; the overlap window is exactly where the bug lived.
        await new Promise((resolve) => setTimeout(resolve, 10));
        refreshed = true;
        return { data: { rotated: true } };
      }
      return refreshed ? { data: ["ok"] } : { error: { status: 401 } };
    });

    const results = await Promise.all([call("users"), call("users"), call("users")]);

    expect(refreshes).toBe(1); // a second refresh would trip reuse detection and log the user out
    expect(results).toEqual([{ data: ["ok"] }, { data: ["ok"] }, { data: ["ok"] }]);
  });

  it("starts a fresh refresh for a later 401 once the first one has settled", async () => {
    raw
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ data: { rotated: true } })
      .mockResolvedValueOnce({ data: ["first"] })
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ data: { rotated: true } })
      .mockResolvedValueOnce({ data: ["second"] });

    await call("users");
    const second = await call("users");

    expect(second).toEqual({ data: ["second"] });
    expect(raw.mock.calls.filter(([args]) => isRefresh(args))).toHaveLength(2);
  });

  it("issues the shared refresh with its OWN abort signal", async () => {
    // The refresh is shared by every waiter, so it must not be cancellable by whichever single
    // query happened to trigger it: that query unmounting would log everyone else out.
    const controller = new AbortController();
    raw
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ data: { rotated: true } })
      .mockResolvedValueOnce({ data: ["ok"] });

    await baseQueryWithReauth({ url: "users" }, callerApi(controller.signal), extra);

    const refreshCall = raw.mock.calls.find(([args]) => isRefresh(args));
    expect(refreshCall?.[1].signal).not.toBe(controller.signal);
    expect(refreshCall?.[1].signal.aborted).toBe(false);
  });

  it("runs the refresh with the signal of the caller that STARTED it, not a stale one", async () => {
    // A single-flight that closed over its first caller's arguments would pin them forever, and
    // every later refresh would carry an abort signal collected long ago.
    raw
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ data: { rotated: true } })
      .mockResolvedValueOnce({ data: ["first"] })
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ data: { rotated: true } })
      .mockResolvedValueOnce({ data: ["second"] });

    const first = new AbortController();
    const second = new AbortController();
    await baseQueryWithReauth({ url: "users" }, callerApi(first.signal), extra);
    first.abort();
    await baseQueryWithReauth({ url: "users" }, callerApi(second.signal), extra);

    const refreshes = raw.mock.calls.filter(([args]) => isRefresh(args));
    expect(refreshes).toHaveLength(2);
    expect(refreshes[1]?.[1].signal.aborted).toBe(false);
  });

  it("calls onAuthFailure when the refresh itself is REJECTED", async () => {
    raw
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ error: { status: 401 } });

    const result = await call("users");

    expect(onAuthFailure).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ error: { status: 401 } });
  });

  it("recognises a 401 that RTK reports as a PARSING_ERROR", async () => {
    // fetchBaseQuery parses the body before it looks at the status, so a 401 answered with HTML
    // or plain text — the normal shape once nginx or Cloudflare sits in front — arrives as
    // PARSING_ERROR. Comparing `status === 401` alone means the refresh flow never runs at all.
    raw
      .mockResolvedValueOnce({ error: { status: "PARSING_ERROR", originalStatus: 401 } })
      .mockResolvedValueOnce({ data: { rotated: true } })
      .mockResolvedValueOnce({ data: ["ok"] });

    const result = await call("users");

    expect(result).toEqual({ data: ["ok"] });
    expect(raw.mock.calls.filter(([args]) => isRefresh(args))).toHaveLength(1);
  });

  it("does NOT sign the user out when the refresh fails for transport reasons", async () => {
    // A dropped socket or a 502 during a rolling deploy says nothing about the session. Treating
    // it as a dead session hard-navigates a user whose cookie is still perfectly valid, mid-form.
    raw
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ error: { status: "FETCH_ERROR", error: "offline" } });

    const result = await call("users");

    expect(onAuthFailure).not.toHaveBeenCalled();
    expect(result).toEqual({ error: { status: 401 } });
  });

  it("stops instead of looping when the RETRY is still 401 after a good refresh", async () => {
    // The refresh succeeds but the new token is still rejected — a changed role claim, clock
    // skew, or a backend answering 401 where it means 403. Without a terminal state every request
    // loops refresh → retry → 401 forever, burning one token rotation each time.
    raw
      .mockResolvedValueOnce({ error: { status: 401 } })
      .mockResolvedValueOnce({ data: { rotated: true } })
      .mockResolvedValueOnce({ error: { status: 401 } });

    const result = await call("users");

    expect(result).toEqual({ error: { status: 401 } });
    expect(raw.mock.calls.filter(([args]) => isRefresh(args))).toHaveLength(1);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("fires onAuthFailure once per failed refresh, not once per waiter", async () => {
    // Four hooks that 401 together join ONE flight and all receive the same outcome. Unguarded,
    // that meant four navigations or four stacked toasts for a single event.
    raw.mockImplementation(async (args: unknown) =>
      isRefresh(args) ? { error: { status: 401 } } : { error: { status: 401 } },
    );

    await Promise.all([call("a"), call("b"), call("c"), call("d")]);

    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });
});
