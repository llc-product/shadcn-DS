// @digitaltwin/api/server — SERVER-side: the request to an internal backend.
//
// The BFF verifies the JWT locally but the backend still needs to know WHO the caller is, to
// enforce per-user authorization / tenancy and to attribute writes. The verified identity is
// forwarded as headers, plus an optional shared service credential.
//
// TRUST BOUNDARY. The backend may treat the identity headers as authoritative ONLY because they
// arrive from the BFF over a trusted network. Three properties keep that true and all three are
// enforced here rather than documented:
//
//   1. The caller's own headers are written FIRST and the identity LAST. A caller can add any
//      header it likes and still cannot spoof an identity, because `set` overwrites.
//   2. The identity VALUES are not configurable. Only the header NAMES are, because backends
//      disagree about naming — a consumer that could pass a user id would have defeated the point.
//   3. `serviceHeaders` DELETES the identity headers rather than leaving them unset, and the
//      service credential is deleted before it is conditionally set. Both are holes that "written
//      last" alone did not close; see the comment at each.
//
// A separate subpath rather than part of the root export, so a client bundle cannot reach the
// identity-forwarding code by importing the package name. The module carries no `server-only`
// marker of its own: it is framework-free, and the app-side wiring is where that marker belongs.

/** The verified caller, structurally compatible with the auth package's `Session`. */
export type ForwardedIdentity = { userId: string; role: string };

export type IdentityHeaderNames = { userId: string; role: string };

export const DEFAULT_IDENTITY_HEADERS: IdentityHeaderNames = {
  userId: "x-user-id",
  role: "x-user-role",
};

/**
 * `RequestInit` plus the cache options Next adds to `fetch`.
 *
 * Declared structurally rather than imported: this module must not depend on Next, but a consumer
 * that runs on it has to be able to pass `next: { revalidate, tags }` through — dropping that
 * option would silently turn every cached read into an uncached one.
 */
export type BackendRequestInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export type BackendErrorKind =
  /** 4xx — the request was wrong or not allowed. Retrying it unchanged will not help. */
  | "client"
  /** 5xx, or a 2xx whose body is not what was promised. The backend is at fault. */
  | "server"
  /** The request did not complete: DNS, connection refused, TLS, a dropped socket. */
  | "transport"
  /** The request exceeded the client's deadline. */
  | "timeout";

/**
 * One error shape for every backend failure.
 *
 * `kind` exists so a caller can answer correctly without re-deriving it from a status code at
 * every call site. The distinction that matters most is `client` versus everything else: a 403
 * means this user may not do this, while a timeout means nobody knows yet — and reporting the
 * second as the first turns an outage into "you don't have permission" for every user at once.
 */
export class BackendError extends Error {
  constructor(
    readonly kind: BackendErrorKind,
    /** The HTTP status, or 0 when the request never got one. */
    readonly status: number,
    readonly method: string,
    readonly path: string,
    /** A short excerpt of the response body, for logs. Never rendered to a user. */
    readonly detail?: string,
    options?: { cause?: unknown },
  ) {
    super(
      `${method} ${path} failed (${kind}${status ? ` ${status}` : ""})${
        detail ? `: ${detail}` : ""
      }`,
      options,
    );
    this.name = "BackendError";
  }
}

export type BackendClientConfig = {
  /**
   * Root of the internal API. A GETTER, not a value: reading it eagerly moves a validated-env
   * access to module-load time, which turns a bare import into a throw wherever the environment is
   * not server-shaped.
   */
  baseUrl: () => string;
  identityHeaders?: IdentityHeaderNames;
  /**
   * Read per call, not captured: a rotated service token should take effect without a restart.
   * Falsy means the backend is trusted to authenticate the BFF some other way (mTLS, network).
   */
  serviceToken?: () => string | undefined;
  /**
   * Deadline for a single request. Node's `fetch` has NO default timeout, so without this a hung
   * backend holds the Next request open until the platform kills it — one slow dependency becomes
   * an exhausted server.
   */
  timeoutMs?: number;
  /** Injectable for tests. Defaults to the global. */
  fetch?: typeof fetch;
};

export const DEFAULT_TIMEOUT_MS = 10_000;

/** Enough body to identify a failure in a log, not enough to dump a page of HTML into one. */
const DETAIL_LIMIT = 200;

export function createBackendClient(config: BackendClientConfig) {
  const names = config.identityHeaders ?? DEFAULT_IDENTITY_HEADERS;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch: typeof fetch =
    config.fetch ?? ((input, init) => globalThis.fetch(input, init));

  /**
   * The service credential.
   *
   * `delete` before the conditional `set`, not just `set` — that ordering is the fix for a real
   * hole. "Written last so a caller cannot forge it" holds only when something IS written: with no
   * service token configured (a documented, supported mode) the `if` did not fire and a caller's
   * own `authorization` survived straight through to a backend that trusts this BFF. A getter
   * transiently returning "" during a secret rotation opened the same hole on a configured
   * deployment.
   */
  function withServiceToken(headers: Headers): Headers {
    headers.delete("authorization");
    const token = config.serviceToken?.();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  }

  function url(path: string): string {
    const base = config.baseUrl().replace(/\/+$/, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  /** The caller's signal and the deadline, whichever fires first. */
  function signalFor(init: BackendRequestInit): AbortSignal {
    const deadline = AbortSignal.timeout(timeoutMs);
    return init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  }

  async function request(path: string, init: BackendRequestInit = {}): Promise<Response> {
    try {
      return await doFetch(url(path), { ...init, signal: signalFor(init) });
    } catch (cause) {
      const method = init.method ?? "GET";
      // A deadline and a caller that cancelled both surface as an abort; only the deadline is ours.
      const timedOut = cause instanceof Error && cause.name === "TimeoutError";
      throw new BackendError(
        timedOut ? "timeout" : "transport",
        0,
        method,
        path,
        timedOut ? `no response in ${timeoutMs}ms` : undefined,
        { cause },
      );
    }
  }

  async function json<T>(path: string, init: BackendRequestInit = {}): Promise<T> {
    const method = init.method ?? "GET";
    const res = await request(path, init);

    if (!res.ok) {
      // Reading the body for a log must never be the thing that fails. `.catch()` alone was not
      // enough: a Response whose `text` is absent throws SYNCHRONOUSLY, and that TypeError then
      // replaced the BackendError the caller was about to receive — an error path that destroys
      // the error it was describing.
      let detail: string | undefined;
      try {
        detail = (await res.text()).slice(0, DETAIL_LIMIT);
      } catch {
        detail = undefined;
      }

      throw new BackendError(
        res.status >= 500 ? "server" : "client",
        res.status,
        method,
        path,
        detail,
      );
    }

    try {
      return (await res.json()) as T;
    } catch (cause) {
      // A 200 that is not the JSON it promised is the backend's fault, not the caller's.
      throw new BackendError("server", res.status, method, path, "unreadable body", {
        cause,
      });
    }
  }

  return {
    /** Headers for one outbound call, carrying the verified identity. */
    headers(session: ForwardedIdentity, extra?: HeadersInit): Headers {
      const headers = new Headers(extra);
      headers.set(names.userId, session.userId);
      headers.set(names.role, session.role);
      return withServiceToken(headers);
    },

    /**
     * Headers for a call made BEFORE there is an identity — signing in, chiefly.
     *
     * A separate method rather than `headers(null, …)`, deliberately. A nullable session parameter
     * is one mistaken `session?.` away from sending a request the backend still trusts, and the
     * type checker would have nothing to say about it. Two names means the absence of an identity
     * is written down at the call site.
     *
     * The identity headers are DELETED here, not merely left unset. Leaving them alone made this
     * method the one hole in the trust boundary: the idiomatic `serviceHeaders(req.headers)` — to
     * carry content-type or a trace id — forwarded whatever `x-user-id` the browser sent into a
     * backend documented as trusting that header because it comes from the BFF.
     */
    serviceHeaders(extra?: HeadersInit): Headers {
      const headers = new Headers(extra);
      headers.delete(names.userId);
      headers.delete(names.role);
      return withServiceToken(headers);
    },

    /**
     * One request. Joins the base URL and applies the deadline; does NOT throw on an HTTP status.
     *
     * Use this where the status is part of the answer — a sign-in route treats 401 as "wrong
     * password", not as a failure. Everything else wants `json`.
     */
    request,

    /**
     * One request whose body is expected to be JSON, with every failure raised as `BackendError`.
     *
     * The return type is asserted, not validated: a schema belongs to the caller, the only layer
     * that knows what it asked for. What this does guarantee is narrower and worth having anyway —
     * that a non-2xx, an unreadable body, a dead socket and a timeout all arrive as one shape.
     */
    json,
  };
}
