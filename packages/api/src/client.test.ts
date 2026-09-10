import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, createApiClient, type ApiClientConfig } from "./client.js";

/** A fetch that records what it was called with and answers whatever the test wants. */
function stubFetch(
  answer: (url: string, init: RequestInit) => Response | Promise<Response>,
) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    return answer(url, init ?? {});
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const ok = (body: unknown = { ok: true }, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });

function client(over: Partial<ApiClientConfig> = {}) {
  const { fn, calls } = stubFetch(() => ok());
  const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn, ...over });
  return { api, calls, fn };
}

const headersOf = (init: RequestInit) => new Headers(init.headers);

describe("the trust boundary", () => {
  it("sends no session cookie until one is bound", async () => {
    const { api, calls } = client();
    await api.get("/users");
    expect(headersOf(calls[0]!.init).get("cookie")).toBeNull();
    expect(api.hasSession).toBe(false);
  });

  it("forwards the bound session as a cookie header", async () => {
    const { api, calls } = client();
    const scoped = api.withSession({ backendCookie: "sid=abc" });
    await scoped.get("/users");
    expect(headersOf(calls[0]!.init).get("cookie")).toBe("sid=abc");
    expect(scoped.hasSession).toBe(true);
  });

  it("REFUSES to let a caller's headers choose the session", async () => {
    const { api, calls } = client();
    await api
      .withSession({ backendCookie: "sid=mine" })
      .get("/users", { headers: { cookie: "sid=someone-else" } });
    expect(headersOf(calls[0]!.init).get("cookie")).toBe("sid=mine");
  });

  it("strips a forged cookie EVEN WITH NO SESSION bound", async () => {
    // A conditional `set` writes nothing when there is nothing to write, which is exactly when a
    // caller's own header would otherwise survive to a backend that trusts this app.
    const { api, calls } = client();
    await api.get("/users", { headers: { cookie: "sid=forged" } });
    expect(headersOf(calls[0]!.init).get("cookie")).toBeNull();
  });

  it("strips a forged authorization EVEN WITH NO SERVICE TOKEN configured", async () => {
    const { api, calls } = client();
    await api.get("/users", { headers: { authorization: "Bearer forged" } });
    expect(headersOf(calls[0]!.init).get("authorization")).toBeNull();
  });

  it("strips a forged authorization when the token getter transiently returns nothing", async () => {
    // What a secret rotation looks like for a moment.
    const { api, calls } = client({ serviceToken: () => "" });
    await api.get("/users", { headers: { authorization: "Bearer forged" } });
    expect(headersOf(calls[0]!.init).get("authorization")).toBeNull();
  });

  it("reads the service token per call, so a rotated credential needs no restart", async () => {
    let token = "one";
    const { api, calls } = client({ serviceToken: () => token });
    await api.get("/a");
    token = "two";
    await api.get("/b");
    expect(headersOf(calls[0]!.init).get("authorization")).toBe("Bearer one");
    expect(headersOf(calls[1]!.init).get("authorization")).toBe("Bearer two");
  });

  it("keeps a caller's other headers", async () => {
    const { api, calls } = client();
    await api.get("/users", { headers: { "x-trace-id": "t-1" } });
    expect(headersOf(calls[0]!.init).get("x-trace-id")).toBe("t-1");
  });
});

describe("withSession", () => {
  it("returns a NEW client and leaves the original unbound", async () => {
    // A request-scoped session written into a module-scoped client leaks across concurrent
    // requests on a server — invisible until it is serving two users at once.
    const { api, calls } = client();
    const scoped = api.withSession({ backendCookie: "sid=abc" });
    expect(scoped).not.toBe(api);

    await api.get("/a");
    await scoped.get("/b");
    expect(headersOf(calls[0]!.init).get("cookie")).toBeNull();
    expect(headersOf(calls[1]!.init).get("cookie")).toBe("sid=abc");
  });

  it("can be rebound without affecting the first binding", async () => {
    const { api, calls } = client();
    const a = api.withSession({ backendCookie: "sid=a" });
    const b = a.withSession({ backendCookie: "sid=b" });
    await a.get("/a");
    await b.get("/b");
    expect(headersOf(calls[0]!.init).get("cookie")).toBe("sid=a");
    expect(headersOf(calls[1]!.init).get("cookie")).toBe("sid=b");
  });
});

describe("building the request", () => {
  it("joins the base URL, with or without a leading slash", async () => {
    const { api, calls } = client();
    await api.get("/users");
    await api.get("users");
    expect(calls[0]!.url).toBe("https://api.test/users");
    expect(calls[1]!.url).toBe("https://api.test/users");
  });

  it("trims trailing slashes off the base URL", async () => {
    const { fn, calls } = stubFetch(() => ok());
    const api = createApiClient({ baseUrl: () => "https://api.test///", fetch: fn });
    await api.get("/users");
    expect(calls[0]!.url).toBe("https://api.test/users");
  });

  it("reads the base URL per call rather than capturing it at construction", async () => {
    let base = "https://one.test";
    const { fn, calls } = stubFetch(() => ok());
    const api = createApiClient({ baseUrl: () => base, fetch: fn });
    await api.get("/x");
    base = "https://two.test";
    await api.get("/x");
    expect(calls[0]!.url).toBe("https://one.test/x");
    expect(calls[1]!.url).toBe("https://two.test/x");
  });

  it("appends a query string, dropping undefined and null", async () => {
    const { api, calls } = client();
    await api.get("/users", {
      query: { page: 2, active: true, q: "ann", cursor: undefined, role: null },
    });
    expect(calls[0]!.url).toBe("https://api.test/users?page=2&active=true&q=ann");
  });

  it("adds to a query string the path already has", async () => {
    const { api, calls } = client();
    await api.get("/users?sort=name", { query: { page: 2 } });
    expect(calls[0]!.url).toBe("https://api.test/users?sort=name&page=2");
  });

  it("leaves the URL alone when every query value was dropped", async () => {
    const { api, calls } = client();
    await api.get("/users", { query: { cursor: undefined } });
    expect(calls[0]!.url).toBe("https://api.test/users");
  });

  it("defaults credentials to include, and lets a caller narrow it", async () => {
    const { api, calls } = client();
    await api.get("/a");
    expect(calls[0]!.init.credentials).toBe("include");

    const omitted = client({ credentials: "omit" });
    await omitted.api.get("/a");
    expect(omitted.calls[0]!.init.credentials).toBe("omit");
  });

  it("falls back to the global fetch when none is injected", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ via: "global" }));
    try {
      const api = createApiClient({ baseUrl: () => "https://api.test" });
      await expect(api.get("/x")).resolves.toEqual({ via: "global" });
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
  });

  it("passes Next's cache options straight through", async () => {
    const { api, calls } = client();
    await api.get("/users", { next: { revalidate: 60, tags: ["users"] } });
    expect((calls[0]!.init as { next?: unknown }).next).toEqual({
      revalidate: 60,
      tags: ["users"],
    });
  });
});

describe("the body", () => {
  it("serialises a plain object as JSON and says so", async () => {
    const { api, calls } = client();
    await api.post("/users", { body: { name: "Ann" } });
    expect(calls[0]!.init.body).toBe('{"name":"Ann"}');
    expect(headersOf(calls[0]!.init).get("content-type")).toBe("application/json");
  });

  it("serialises an array too", async () => {
    const { api, calls } = client();
    await api.post("/bulk", { body: [1, 2] });
    expect(calls[0]!.init.body).toBe("[1,2]");
  });

  it("keeps a caller's own content-type, so a vendor JSON type survives", async () => {
    const { api, calls } = client();
    await api.post("/users", {
      body: { name: "Ann" },
      headers: { "content-type": "application/vnd.acme+json" },
    });
    expect(headersOf(calls[0]!.init).get("content-type")).toBe(
      "application/vnd.acme+json",
    );
  });

  it.each([
    ["a string", "raw"],
    ["URLSearchParams", new URLSearchParams({ a: "1" })],
    ["FormData", new FormData()],
    ["a Blob", new Blob(["x"])],
    ["a typed array", new Uint8Array([1, 2, 3])],
  ])(
    "passes %s through untouched, with no content-type of ours",
    async (_label, body) => {
      // Guessing at these is how a multipart upload turns into "[object FormData]".
      const { api, calls } = client();
      await api.post("/upload", { body });
      expect(calls[0]!.init.body).toBe(body);
      expect(headersOf(calls[0]!.init).get("content-type")).toBeNull();
    },
  );

  it("sends no body when there is none", async () => {
    const { api, calls } = client();
    await api.get("/users");
    expect(calls[0]!.init.body).toBeUndefined();
    expect(headersOf(calls[0]!.init).get("content-type")).toBeNull();
  });
});

describe("the verbs", () => {
  it.each(["GET", "POST", "PUT", "PATCH", "DELETE"] as const)(
    "%s sets the method",
    async (method) => {
      const { api, calls } = client();
      const call = {
        GET: () => api.get("/x"),
        POST: () => api.post("/x"),
        PUT: () => api.put("/x"),
        PATCH: () => api.patch("/x"),
        DELETE: () => api.delete("/x"),
      }[method];
      await call();
      expect(calls[0]!.init.method).toBe(method);
    },
  );

  it("returns the parsed body", async () => {
    const { fn } = stubFetch(() => ok({ id: 7, name: "Ann" }));
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.get<{ id: number }>("/users/7")).resolves.toEqual({
      id: 7,
      name: "Ann",
    });
  });

  it("returns undefined for a 204, rather than calling the correct answer broken", async () => {
    const { fn } = stubFetch(() => new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.delete("/users/7")).resolves.toBeUndefined();
  });

  it("returns undefined for a 200 that declares an empty body", async () => {
    const { fn } = stubFetch(
      () => new Response("", { status: 200, headers: { "content-length": "0" } }),
    );
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.post("/ping")).resolves.toBeUndefined();
  });
});

describe("request()", () => {
  it("does NOT throw on a status — the status is the answer", async () => {
    // A sign-in route treats 401 as "wrong password", not as a failure.
    const { fn } = stubFetch(() => new Response("nope", { status: 401 }));
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    const res = await api.request("/auth/login", { method: "POST", body: { pw: "x" } });
    expect(res.status).toBe(401);
  });

  it("still throws when there was no response at all", async () => {
    const { fn } = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.request("/x")).rejects.toMatchObject({
      kind: "transport",
      status: 0,
    });
  });
});

describe("the failure taxonomy", () => {
  it("calls a 4xx a client error and a 5xx a server error", async () => {
    for (const [status, kind] of [
      [404, "client"],
      [503, "server"],
    ] as const) {
      const { fn } = stubFetch(() => new Response("boom", { status }));
      const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
      await expect(api.get("/x")).rejects.toMatchObject({ kind, status });
    }
  });

  it("calls a dead socket a transport error", async () => {
    const { fn } = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "transport", status: 0 });
  });

  it("carries the method and the path for a log", async () => {
    const { fn } = stubFetch(() => new Response("boom", { status: 500 }));
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.post("/users")).rejects.toMatchObject({
      method: "POST",
      path: "/users",
      name: "ApiError",
    });
  });

  it("truncates the body excerpt instead of putting a page of HTML in a log line", async () => {
    const { fn } = stubFetch(() => new Response("x".repeat(50_000), { status: 500 }));
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    const error = await api.get("/x").catch((e: unknown) => e as ApiError);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).detail?.length).toBeLessThanOrEqual(200);
  });

  it("still produces an ApiError when the body cannot even be read for a log", async () => {
    // An error path that destroys the error it was describing is the bug this guards.
    const broken = new Response("x", { status: 500 });
    Object.defineProperty(broken, "body", {
      get() {
        throw new TypeError("no body");
      },
    });
    const { fn } = stubFetch(() => broken);
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.get("/x")).rejects.toMatchObject({
      kind: "server",
      detail: undefined,
    });
  });

  it("calls a 200 with an unreadable body a server error", async () => {
    const { fn } = stubFetch(
      () =>
        new Response("not json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.get("/x")).rejects.toMatchObject({
      kind: "server",
      detail: "unreadable body",
    });
  });
});

describe("the deadline", () => {
  it("attaches one even when the caller passes no signal", async () => {
    const { api, calls } = client();
    await api.get("/x");
    expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps the caller's own signal working alongside the deadline", async () => {
    const controller = new AbortController();
    const { api, calls } = client();
    await api.get("/x", { signal: controller.signal });
    const signal = calls[0]!.init.signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("calls an exceeded deadline a timeout, not a transport failure", async () => {
    const { fn } = stubFetch(async (_url, init) => {
      await new Promise((resolve) => init.signal?.addEventListener("abort", resolve));
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    });
    const api = createApiClient({
      baseUrl: () => "https://api.test",
      fetch: fn,
      timeoutMs: 5,
    });
    await expect(api.get("/slow")).rejects.toMatchObject({ kind: "timeout", status: 0 });
  });

  it("calls a caller's own cancellation a transport failure, not a timeout", async () => {
    // Only the deadline is ours. Reporting a cancelled request as our timeout would put an
    // outage in the logs for a user who navigated away.
    const controller = new AbortController();
    const { fn } = stubFetch(async () => {
      controller.abort();
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    const api = createApiClient({ baseUrl: () => "https://api.test", fetch: fn });
    await expect(api.get("/x", { signal: controller.signal })).rejects.toMatchObject({
      kind: "transport",
    });
  });

  it("calls a body that stalls past the deadline a timeout, not a lying backend", async () => {
    const stalled = new Response("{", { status: 200 });
    const { fn } = stubFetch(async (_url, init) => {
      Object.defineProperty(stalled, "json", {
        value: async () => {
          await new Promise((resolve) => init.signal?.addEventListener("abort", resolve));
          throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
        },
      });
      return stalled;
    });
    const api = createApiClient({
      baseUrl: () => "https://api.test",
      fetch: fn,
      timeoutMs: 5,
    });
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "timeout", status: 200 });
  });
});

describe("onUnauthorized", () => {
  let onUnauthorized: ReturnType<typeof vi.fn<(error: ApiError) => void>>;

  beforeEach(() => {
    onUnauthorized = vi.fn<(error: ApiError) => void>();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([401, 403])(
    "fires on %i, with the error it is about to throw",
    async (status) => {
      const { fn } = stubFetch(() => new Response("no", { status }));
      const api = createApiClient({
        baseUrl: () => "https://api.test",
        fetch: fn,
        onUnauthorized,
      });
      await expect(api.get("/x")).rejects.toBeInstanceOf(ApiError);
      expect(onUnauthorized).toHaveBeenCalledOnce();
      expect(onUnauthorized.mock.calls[0]?.[0]).toMatchObject({ status });
    },
  );

  it("does NOT fire on any other status", async () => {
    const { fn } = stubFetch(() => new Response("boom", { status: 500 }));
    const api = createApiClient({
      baseUrl: () => "https://api.test",
      fetch: fn,
      onUnauthorized,
    });
    await expect(api.get("/x")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does NOT fire on a transport failure or a timeout", async () => {
    // These say nothing about the session. Signing someone out over a two-second wifi drop is
    // the bug this separation exists to prevent.
    const { fn } = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const api = createApiClient({
      baseUrl: () => "https://api.test",
      fetch: fn,
      onUnauthorized,
    });
    await expect(api.get("/x")).rejects.toMatchObject({ kind: "transport" });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not fire from request(), where the status is the answer", async () => {
    const { fn } = stubFetch(() => new Response("no", { status: 401 }));
    const api = createApiClient({
      baseUrl: () => "https://api.test",
      fetch: fn,
      onUnauthorized,
    });
    await api.request("/auth/login", { method: "POST" });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("sessionCookieFrom", () => {
  const withSetCookie = (...values: string[]) => {
    const res = new Response(null, { status: 200 });
    for (const value of values) res.headers.append("set-cookie", value);
    return res;
  };

  it("returns the name=value pair and drops the browser attributes", () => {
    const { api } = client({ sessionCookieName: () => "sid" });
    const res = withSetCookie("sid=abc; Path=/; HttpOnly; Max-Age=3600");
    expect(api.sessionCookieFrom(res)).toBe("sid=abc");
  });

  it("picks the right cookie out of several", () => {
    const { api } = client({ sessionCookieName: () => "sid" });
    const res = withSetCookie("other=1; Path=/", "sid=abc; Path=/", "csrf=z");
    expect(api.sessionCookieFrom(res)).toBe("sid=abc");
  });

  it("returns null when the response set no such cookie", () => {
    const { api } = client({ sessionCookieName: () => "sid" });
    expect(api.sessionCookieFrom(withSetCookie("other=1"))).toBeNull();
  });

  it("returns null when no cookie name is configured, rather than guessing", () => {
    const { api } = client();
    expect(api.sessionCookieFrom(withSetCookie("sid=abc"))).toBeNull();
  });
});
