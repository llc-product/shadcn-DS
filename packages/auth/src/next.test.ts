// @vitest-environment node
//
// The session helpers: the layer that decides whether a request is carrying a session. Every case
// here is a way the wrong answer becomes a session someone should not have, or a redirect that
// never happens.
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { UnauthorizedError, createSessionHelpers } from "./next.js";

/** A NextResponse is only used here for `.cookies.set`, so that is all the double provides. */
const fakeResponse = () => {
  const set = vi.fn();
  return { res: { cookies: { set } } as never, set };
};

const onUnauthenticatedPage = vi.fn();

const helpers = (overrides: Record<string, unknown> = {}) =>
  createSessionHelpers({
    cookieName: "session",
    ttlS: 604800,
    onUnauthenticatedPage: onUnauthenticatedPage as never,
    ...overrides,
  });

beforeEach(() => {
  cookieStore.get.mockReset().mockReturnValue({ value: "sid=abc" });
  onUnauthenticatedPage.mockReset();
});

describe("getSession", () => {
  it("reads THIS app's wrapper cookie by the configured name", async () => {
    await expect(helpers().getSession()).resolves.toEqual({ backendCookie: "sid=abc" });
    expect(cookieStore.get).toHaveBeenCalledWith("session");
  });

  it("answers null when there is no cookie at all", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(helpers().getSession()).resolves.toBeNull();
  });

  it("treats an EMPTY cookie as absent", async () => {
    // What a cleared cookie looks like before the browser drops it. Sending `Cookie: ` onward
    // would be a request with no session dressed up as one that has one.
    cookieStore.get.mockReturnValue({ value: "" });
    await expect(helpers().getSession()).resolves.toBeNull();
  });

  it("carries no identity, because the value is opaque", async () => {
    const session = await helpers().getSession();
    expect(Object.keys(session ?? {})).toEqual(["backendCookie"]);
  });
});

describe("requireSession", () => {
  it("returns the session when there is one, without redirecting", async () => {
    await expect(helpers().requireSession()).resolves.toEqual({
      backendCookie: "sid=abc",
    });
    expect(onUnauthenticatedPage).not.toHaveBeenCalled();
  });

  it("hands off to the app's redirect when there is none", async () => {
    cookieStore.get.mockReturnValue(undefined);
    onUnauthenticatedPage.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    await expect(helpers().requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(onUnauthenticatedPage).toHaveBeenCalledOnce();
  });

  it("still refuses to return a null session if the redirect forgets to throw", async () => {
    // redirect() throws, but a caller can pass anything. Falling through here would hand a page
    // a session it does not have, which is the failure the whole guard exists to prevent.
    cookieStore.get.mockReturnValue(undefined);
    onUnauthenticatedPage.mockResolvedValue(undefined);
    await expect(helpers().requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("assertSession", () => {
  it("returns the session when there is one", async () => {
    await expect(helpers().assertSession()).resolves.toEqual({
      backendCookie: "sid=abc",
    });
  });

  it("throws UnauthorizedError rather than redirecting", async () => {
    // A redirect from a route handler answers 307; a fetch client follows it and receives HTML,
    // so the client never sees the 401 that drives its sign-out.
    cookieStore.get.mockReturnValue(undefined);
    await expect(helpers().assertSession()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(onUnauthenticatedPage).not.toHaveBeenCalled();
  });
});

describe("setSessionCookie", () => {
  it("stores the backend's value HttpOnly, for the configured lifetime", async () => {
    const { res, set } = fakeResponse();
    helpers().setSessionCookie(res, "sid=fresh");
    expect(set).toHaveBeenCalledWith("session", "sid=fresh", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 604800,
    });
  });

  it("marks the cookie secure in production", async () => {
    const { res, set } = fakeResponse();
    helpers({ isSecure: () => true }).setSessionCookie(res, "sid=fresh");
    expect(set.mock.calls[0]?.[2]).toMatchObject({ secure: true });
  });

  it("asks whether it is secure PER CALL, so a deployment change needs no restart", async () => {
    const isSecure = vi.fn().mockReturnValue(false);
    const { res } = fakeResponse();
    const h = helpers({ isSecure });
    h.setSessionCookie(res, "a");
    h.setSessionCookie(res, "b");
    expect(isSecure).toHaveBeenCalledTimes(2);
  });
});

describe("clearSessionCookie", () => {
  it("expires it with the SAME attributes it was set with", async () => {
    // A browser drops a cookie only when the expiring Set-Cookie matches on name, path and the
    // rest. Clearing with a different shape leaves the original in place, and the user is still
    // signed in after pressing sign out.
    const { res, set } = fakeResponse();
    const h = helpers();
    h.setSessionCookie(res, "sid=abc");
    h.clearSessionCookie(res);

    const [, , setOpts] = set.mock.calls[0]!;
    const [name, value, clearOpts] = set.mock.calls[1]!;
    expect(name).toBe("session");
    expect(value).toBe("");
    expect(clearOpts).toEqual({ ...(setOpts as object), maxAge: 0 });
  });
});
