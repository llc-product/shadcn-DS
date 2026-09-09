// @vitest-environment node
//
// The backend client. Two things are being tested and they are different in kind: the trust
// boundary, where a wrong answer is a security hole, and the failure taxonomy, where a wrong
// answer is an outage reported as a permissions problem.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BackendError, DEFAULT_IDENTITY_HEADERS, createBackendClient } from "./server";

const session = { userId: "u1", role: "owner" };

/** A body that cannot be parsed, distinct from "no body argument given". */
const UNREADABLE = Symbol("unreadable");

const respond = (status: number, body: unknown = {}, text?: string) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === UNREADABLE) throw new SyntaxError("Unexpected end of JSON input");
      return body;
    },
    text: async () => text ?? JSON.stringify(body),
  }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;
const client = (overrides: Record<string, unknown> = {}) =>
  createBackendClient({
    baseUrl: () => "http://backend.test/api",
    serviceToken: () => "service-token",
    fetch: fetchMock as unknown as typeof fetch,
    ...overrides,
  });

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(respond(200, { ok: true }));
});

describe("the trust boundary", () => {
  it("forwards the verified identity under the default header names", () => {
    const headers = client().headers(session);
    expect(headers.get("x-user-id")).toBe("u1");
    expect(headers.get("x-user-role")).toBe("owner");
    expect(DEFAULT_IDENTITY_HEADERS).toEqual({
      userId: "x-user-id",
      role: "x-user-role",
    });
  });

  it("REFUSES to let a caller's headers spoof the identity", () => {
    // `extra` is written first and the identity last, so `set` overwrites. Reverse those two
    // lines and this test is the only thing that notices.
    const headers = client().headers(session, {
      "x-user-id": "attacker",
      "x-user-role": "admin",
      "x-tenant": "acme",
    });

    expect(headers.get("x-user-id")).toBe("u1");
    expect(headers.get("x-user-role")).toBe("owner");
    expect(headers.get("x-tenant")).toBe("acme"); // other headers still pass through
  });

  it("STRIPS the identity headers from a service call", () => {
    // The hole this closes: `serviceHeaders(req.headers)` — the idiomatic way to carry a
    // content-type or a trace id — forwarded whatever x-user-id the browser sent into a backend
    // documented as trusting that header because it comes from the BFF.
    const headers = client().serviceHeaders({
      "x-user-id": "attacker",
      "x-user-role": "admin",
      "content-type": "application/json",
    });

    expect(headers.get("x-user-id")).toBeNull();
    expect(headers.get("x-user-role")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("refuses a forged authorization header EVEN WITH NO SERVICE TOKEN configured", () => {
    // The second hole: a conditional `set` writes nothing when there is no token, so the caller's
    // own header survived. No-token is a documented, supported mode — and the mode where the
    // backend is most likely to honour whatever Authorization arrives.
    const noToken = createBackendClient({ baseUrl: () => "http://backend.test/api" });
    expect(
      noToken.headers(session, { authorization: "Bearer forged" }).get("authorization"),
    ).toBeNull();
    expect(
      noToken.serviceHeaders({ authorization: "Bearer forged" }).get("authorization"),
    ).toBeNull();

    const rotating = createBackendClient({
      baseUrl: () => "http://backend.test/api",
      serviceToken: () => "", // a secret manager mid-rotation
    });
    expect(
      rotating.headers(session, { authorization: "Bearer forged" }).get("authorization"),
    ).toBeNull();
  });

  it("renames the identity headers but never their values", () => {
    const renamed = client({
      identityHeaders: { userId: "x-actor", role: "x-actor-role" },
    });
    const headers = renamed.headers(session, { "x-actor": "attacker" });

    expect(headers.get("x-actor")).toBe("u1");
    expect(headers.get("x-user-id")).toBeNull();
    expect(renamed.serviceHeaders({ "x-actor": "attacker" }).get("x-actor")).toBeNull();
  });

  it("reads the service token per call, so a rotated credential needs no restart", () => {
    let token = "first";
    const rotating = client({ serviceToken: () => token });
    expect(rotating.headers(session).get("authorization")).toBe("Bearer first");
    token = "second";
    expect(rotating.headers(session).get("authorization")).toBe("Bearer second");
  });
});

describe("building the request", () => {
  it("joins the base URL, with or without a leading slash", async () => {
    await client().request("/users");
    await client().request("users");
    await client({ baseUrl: () => "http://backend.test/api/" }).request("/users");

    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toBe("http://backend.test/api/users");
    }
  });

  it("reads the base URL per call rather than capturing it at construction", async () => {
    // Same reason as the service token: this is a validated-env read, and an eager one turns a
    // bare import into a throw wherever the environment is not server-shaped.
    const baseUrl = vi.fn(() => "http://backend.test/api");
    const lazy = client({ baseUrl });
    expect(baseUrl).not.toHaveBeenCalled();

    await lazy.request("/users");
    expect(baseUrl).toHaveBeenCalledTimes(1);
  });

  it("attaches a deadline even when the caller passes no signal", async () => {
    await client().request("/users");
    expect(fetchMock.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps the caller's own signal working alongside the deadline", async () => {
    // Node's fetch has no default timeout, so the deadline is not optional — but neither is the
    // caller's ability to cancel. Both must be able to abort the request.
    const controller = new AbortController();
    await client().request("/users", { signal: controller.signal });

    const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("falls back to the global fetch when none is injected", async () => {
    // The default is the only path a real deployment takes, and injecting a fetch in every test
    // means it is otherwise never executed at all.
    const globalFetch = vi.fn().mockResolvedValue(respond(200, { ok: true }));
    vi.stubGlobal("fetch", globalFetch);

    const real = createBackendClient({ baseUrl: () => "http://backend.test/api" });
    await real.request("/ping");

    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(globalFetch.mock.calls[0]![0]).toBe("http://backend.test/api/ping");
    vi.unstubAllGlobals();
  });

  it("passes Next's cache options straight through", async () => {
    // Dropping `next` would silently turn every cached read into an uncached one.
    await client().request("/example", { next: { revalidate: 30, tags: ["example"] } });
    expect(fetchMock.mock.calls[0]![1].next).toEqual({
      revalidate: 30,
      tags: ["example"],
    });
  });
});

describe("the failure taxonomy", () => {
  const kindOf = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return "no-error";
    } catch (error) {
      return error instanceof BackendError ? error.kind : "wrong-type";
    }
  };

  it("calls a 4xx a client error and a 5xx a server error", async () => {
    // Not cosmetic: a caller maps `client` to the status it received and everything else to a 502,
    // and collapsing them turns an outage into "you don't have permission" for every user at once.
    fetchMock.mockResolvedValueOnce(respond(403, {}, "forbidden"));
    expect(await kindOf(() => client().json("/users"))).toBe("client");

    fetchMock.mockResolvedValueOnce(respond(503, {}, "upstream down"));
    expect(await kindOf(() => client().json("/users"))).toBe("server");
  });

  it("calls a dead socket a transport error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await kindOf(() => client().json("/users"))).toBe("transport");
  });

  it("calls an exceeded deadline a timeout", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    fetchMock.mockRejectedValueOnce(timeout);
    expect(await kindOf(() => client().json("/users"))).toBe("timeout");
  });

  it("calls a 200 with an unreadable body a server error", async () => {
    // A 200 that is not the JSON it promised is the backend's fault, not the caller's — and
    // returning `undefined` here would hand a page a value every downstream check then evaluates.
    fetchMock.mockResolvedValueOnce(respond(200, UNREADABLE));
    expect(await kindOf(() => client().json("/users"))).toBe("server");
  });

  it("carries the status, the method and the path for a log", async () => {
    fetchMock.mockResolvedValueOnce(respond(404, {}, "no such user"));
    try {
      await client().json("/users/u9", { method: "GET" });
      expect.unreachable();
    } catch (error) {
      const backendError = error as BackendError;
      expect(backendError.status).toBe(404);
      expect(backendError.method).toBe("GET");
      expect(backendError.path).toBe("/users/u9");
      expect(backendError.detail).toContain("no such user");
    }
  });

  it("truncates the body excerpt instead of putting a page of HTML in a log line", async () => {
    fetchMock.mockResolvedValueOnce(respond(500, {}, "x".repeat(5000)));
    try {
      await client().json("/users");
      expect.unreachable();
    } catch (error) {
      expect((error as BackendError).detail!.length).toBeLessThanOrEqual(200);
    }
  });

  it("does NOT throw on a status when the caller used request()", async () => {
    // Sign-in needs this: a 401 there means "wrong password", a normal outcome, not a failure.
    fetchMock.mockResolvedValueOnce(respond(401));
    const res = await client().request("/auth/login", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("still throws from request() when there was no response at all", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await kindOf(() => client().request("/auth/login"))).toBe("transport");
  });

  it("still produces a BackendError when the body cannot even be read for a log", async () => {
    // A minimal Response — no `text` at all — is what a hand-rolled test double looks like, and
    // an error path that throws while describing an error is worse than one with no detail.
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response);
    expect(await kindOf(() => client().json("/users"))).toBe("server");
  });

  it("returns the parsed body on success", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, [{ id: "u1" }]));
    await expect(client().json<{ id: string }[]>("/users")).resolves.toEqual([
      { id: "u1" },
    ]);
  });
});
