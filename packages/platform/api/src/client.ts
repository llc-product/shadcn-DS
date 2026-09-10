// @digitaltwin/api — one API client instance, usable from a browser and from a server.
//
// The backend owns the session. This package signs nothing and verifies nothing; it carries a
// session someone else issued and reports what came back. That is why there is no refresh here:
// there is no token to rotate and no endpoint to rotate it with, so a 401 means the session is
// over rather than "try again after refreshing".
//
// ── ONE CLIENT, TWO ENVIRONMENTS ────────────────────────────────────────────────────────────────
// The two sides differ in exactly one respect, and it is config, not code:
//
//   browser — the app's own cookie is attached by the browser on a same-origin request, so
//             `credentials` is what matters and a `Cookie` header cannot be set from JS anyway;
//   server  — there is no cookie jar, so the backend's cookie is forwarded explicitly through
//             `withSession()`.
//
// Nothing in this module imports `next/*`, `server-only`, or reads an environment, so it is the
// package ROOT rather than a subpath: there is no server-only code here for a client bundle to
// reach.
//
// ── TRUST BOUNDARY ──────────────────────────────────────────────────────────────────────────────
// Server-side, the backend recognises the session cookie this app replays. Two properties keep a
// caller from choosing whose session a request runs under, and both are enforced here rather than
// documented:
//
//   1. A caller's own headers are written FIRST and the credentials LAST, so `headers` can carry
//      anything and still cannot pick an identity.
//   2. `cookie` and `authorization` are DELETED before either is conditionally set. A conditional
//      `set` writes nothing when there is nothing to write — and with no service token configured
//      (a supported mode) that left a caller's own `authorization` intact all the way to a backend
//      that trusts this app.

/** The session this app holds for a caller: the backend's own cookie, opaque to us. */
export type ApiSession = { backendCookie: string };

/**
 * `RequestInit` plus the cache options Next adds to `fetch`.
 *
 * Declared structurally rather than imported: this module must not depend on Next, but a consumer
 * running on it has to be able to pass `next: { revalidate, tags }` through — dropping that option
 * would silently turn every cached read into an uncached one.
 */
export type ApiRequestInit = Omit<RequestInit, "body"> & {
  next?: { revalidate?: number | false; tags?: string[] };
  /**
   * A plain object or array is serialised as JSON and given a content-type. Anything the platform
   * already knows how to send — FormData, Blob, URLSearchParams, a string, a stream — is passed
   * through untouched, because guessing at those is how a multipart upload turns into `"[object
   * FormData]"`.
   */
  body?: unknown;
  /** Appended as a query string. `undefined` and `null` are dropped rather than sent as "undefined". */
  query?: Record<string, string | number | boolean | null | undefined>;
};

export type ApiErrorKind =
  /** 4xx — the request was wrong or not allowed. Retrying it unchanged will not help. */
  | "client"
  /** 5xx, or a 2xx whose body is not what was promised. The backend is at fault. */
  | "server"
  /** The request did not complete: DNS, connection refused, TLS, a dropped socket. */
  | "transport"
  /** The request exceeded the client's deadline. */
  | "timeout";

/**
 * One error shape for every API failure.
 *
 * `kind` exists so a caller can answer correctly without re-deriving it from a status code at
 * every call site. The distinction that matters most is `client` versus everything else: a 403
 * means this user may not do this, while a timeout means nobody knows yet — and reporting the
 * second as the first turns an outage into "you don't have permission" for every user at once.
 */
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
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
    this.name = "ApiError";
  }
}

export type ApiClientConfig = {
  /**
   * Root of the API. A GETTER, not a value: reading it eagerly moves a validated-env access to
   * module-load time, which turns a bare import into a throw wherever the environment is not
   * server-shaped.
   */
  baseUrl: () => string;
  /**
   * Name of the session cookie the BACKEND sets. Only needed to pull a rotated value back out of a
   * response — see `sessionCookieFrom`.
   */
  sessionCookieName?: () => string;
  /**
   * Read per call, not captured: a rotated service token should take effect without a restart.
   * Falsy means the backend is trusted to authenticate this app some other way (mTLS, network).
   */
  serviceToken?: () => string | undefined;
  /**
   * Browser-side: whether the app's own cookie rides along. Left at "include" because the whole
   * cookie-only model depends on it for a same-origin request. Ignored where there is no cookie
   * jar, which is why the server side forwards its cookie through `withSession()` instead.
   */
  credentials?: "include" | "same-origin" | "omit";
  /**
   * Deadline for a single request. Node's `fetch` has NO default timeout, so without this a hung
   * backend holds the request open until the platform kills it — one slow dependency becomes an
   * exhausted server.
   */
  timeoutMs?: number;
  /**
   * Called when a response is 401 or 403, before the `ApiError` is thrown.
   *
   * The session is over and the app decides what that looks like — a hard navigation to sign-in, a
   * toast, a store reset. It fires on the RESPONSE, never on a transport failure or a timeout:
   * those say nothing about the session, and signing someone out over a two-second wifi drop is
   * the bug this separation exists to prevent.
   */
  onUnauthorized?: (error: ApiError) => void;
  /** Injectable for tests. Defaults to the global. */
  fetch?: typeof fetch;
};

export const DEFAULT_TIMEOUT_MS = 10_000;

/** Enough body to identify a failure in a log, not enough to dump a page of HTML into one. */
const DETAIL_LIMIT = 200;

/**
 * Was this OUR deadline, rather than the caller cancelling?
 *
 * Asked of the deadline signal itself, never of the combined one. `AbortSignal.any([caller,
 * deadline])` reports `aborted` for either source, so a combined-signal check calls a user who
 * navigated away a backend timeout — and the error name does not separate them either, because
 * accepting `AbortError` as a timeout accepts exactly the caller's own cancellation. Only the
 * deadline signal knows whose abort it was.
 */
const firedTheDeadline = (deadline: AbortSignal) => deadline.aborted;

/** Bodies the platform already knows how to send. Anything else is treated as JSON. */
function isNativeBody(body: unknown): boolean {
  return (
    typeof body === "string" ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
    (typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
  );
}

/**
 * A short excerpt of a failed response, for a log.
 *
 * Reads a BOUNDED prefix rather than `await res.text()`. A 5xx from a WAF or an ingress is often a
 * multi-megabyte HTML page, and buffering all of it to keep 200 characters is worst during exactly
 * the storm that produces them.
 *
 * Reading it must also never be the thing that fails: a Response whose `body` or `text` is absent
 * throws SYNCHRONOUSLY, and that TypeError would replace the ApiError the caller was about to
 * receive — an error path that destroys the error it was describing.
 */
async function excerpt(res: Response): Promise<string | undefined> {
  try {
    const reader = res.body?.getReader();
    if (!reader) return (await res.text()).slice(0, DETAIL_LIMIT);

    const { value } = await reader.read();
    await reader.cancel();
    return value
      ? new TextDecoder().decode(value.slice(0, DETAIL_LIMIT * 4)).slice(0, DETAIL_LIMIT)
      : undefined;
  } catch {
    return undefined;
  }
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(config: ApiClientConfig, session?: ApiSession) {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const credentials = config.credentials ?? "include";
  const doFetch: typeof fetch =
    config.fetch ?? ((input, init) => globalThis.fetch(input, init));

  /** Strip anything a caller could have used to choose an identity, then set ours. */
  function withCredentials(headers: Headers): Headers {
    headers.delete("cookie");
    headers.delete("authorization");

    if (session?.backendCookie) headers.set("cookie", session.backendCookie);

    const token = config.serviceToken?.();
    if (token) headers.set("authorization", `Bearer ${token}`);

    return headers;
  }

  function url(path: string, query?: ApiRequestInit["query"]): string {
    const base = config.baseUrl().replace(/\/+$/, "");
    const joined = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    if (!query) return joined;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${joined}${joined.includes("?") ? "&" : "?"}${qs}` : joined;
  }

  /**
   * The deadline, and the signal the request actually runs under — the caller's and ours,
   * whichever fires first. Both are returned: the combined one governs the request, and the
   * deadline is the only thing that can say the abort was ours.
   */
  function signalsFor(init: ApiRequestInit): {
    signal: AbortSignal;
    deadline: AbortSignal;
  } {
    const deadline = AbortSignal.timeout(timeoutMs);
    return {
      deadline,
      signal: init.signal ? AbortSignal.any([init.signal, deadline]) : deadline,
    };
  }

  /** RequestInit for one call: JSON encoding, credentials, and the trust boundary. */
  function buildInit(init: ApiRequestInit, signal: AbortSignal): RequestInit {
    const headers = new Headers(init.headers);
    const { body, query: _query, ...rest } = init;

    let encoded: BodyInit | null | undefined;
    if (body === undefined || body === null) {
      encoded = body as null | undefined;
    } else if (isNativeBody(body)) {
      encoded = body as BodyInit;
    } else {
      encoded = JSON.stringify(body);
      // `set` only when absent: a caller sending JSON with a vendor content-type
      // (application/vnd.foo+json) means it.
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }

    return {
      ...rest,
      credentials,
      headers: withCredentials(headers),
      body: encoded,
      signal,
    };
  }

  /**
   * The request, plus the deadline that governs it — including while its BODY is read.
   *
   * The deadline is returned alongside the response so `json` can tell a timed-out stream from a
   * backend that lied about its 200. Without it, a body that stalls after the headers arrive is
   * reported as "unreadable body" from the server, which is the exact conflation `ApiErrorKind`
   * exists to prevent.
   */
  async function send(
    path: string,
    init: ApiRequestInit,
  ): Promise<{ res: Response; deadline: AbortSignal }> {
    const method = init.method ?? "GET";

    // OUTSIDE the try, deliberately. `url()` calls the baseUrl getter, and a missing or invalid
    // one is a configuration fault — classifying it as `transport` tells every user "the service
    // is unavailable" for what one unset variable would fix, with nothing pointing at it.
    const target = url(path, init.query);
    const { signal, deadline } = signalsFor(init);

    try {
      return { res: await doFetch(target, buildInit(init, signal)), deadline };
    } catch (cause) {
      // A deadline and a caller that cancelled both surface as an abort; only the deadline is ours.
      const timedOut = firedTheDeadline(deadline);
      throw new ApiError(
        timedOut ? "timeout" : "transport",
        0,
        method,
        path,
        timedOut ? `no response in ${timeoutMs}ms` : undefined,
        { cause },
      );
    }
  }

  async function request(path: string, init: ApiRequestInit = {}): Promise<Response> {
    return (await send(path, init)).res;
  }

  async function json<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const method = init.method ?? "GET";
    const { res, deadline } = await send(path, init);

    if (!res.ok) {
      const error = new ApiError(
        res.status >= 500 ? "server" : "client",
        res.status,
        method,
        path,
        await excerpt(res),
      );
      if (res.status === 401 || res.status === 403) config.onUnauthorized?.(error);
      throw error;
    }

    // 204, and any other answer with no body. `res.json()` on an empty body throws, and a DELETE
    // that correctly answers 204 is the most ordinary call there is — reporting it as a backend
    // that lied about its status would make the correct response the broken one.
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }

    try {
      return (await res.json()) as T;
    } catch (cause) {
      // A stream that stopped because the DEADLINE fired is a timeout, not a backend that lied
      // about its 200. Reporting it as the latter points at nothing.
      if (firedTheDeadline(deadline)) {
        throw new ApiError(
          "timeout",
          res.status,
          method,
          path,
          `body not delivered in ${timeoutMs}ms`,
          { cause },
        );
      }
      throw new ApiError("server", res.status, method, path, "unreadable body", {
        cause,
      });
    }
  }

  const verb =
    (method: string) =>
    <T>(path: string, init: ApiRequestInit = {}): Promise<T> =>
      json<T>(path, { ...init, method });

  return {
    get: verb("GET"),
    post: verb("POST"),
    put: verb("PUT"),
    patch: verb("PATCH"),
    delete: verb("DELETE"),

    /**
     * One request. Joins the base URL and applies the deadline; does NOT throw on an HTTP status.
     *
     * Use this where the status is part of the answer — a sign-in route treats 401 as "wrong
     * password", not as a failure. Everything else wants a verb.
     */
    request,

    /**
     * The same client, bound to a caller's session.
     *
     * Returns a NEW client rather than mutating this one: a request-scoped session on a
     * module-scoped client would leak across concurrent requests on a server, which is the one
     * bug in this area that is invisible until it is serving two users at once.
     *
     * The unbound client carries no session at all — it is the right thing for signing in and for
     * genuinely public endpoints, and the only way to send a caller's session is to say so here.
     */
    withSession(next: ApiSession) {
      return createApiClient(config, next);
    },

    /** Is this client carrying a session? */
    get hasSession(): boolean {
      return Boolean(session?.backendCookie);
    },

    /**
     * Pull the backend's session cookie out of a response, if it set one.
     *
     * Returns the whole `name=value` pair, because that is what goes back out as a `Cookie`
     * header. The attributes (Path, HttpOnly, Max-Age) are the backend's instructions to a browser
     * that will never see this cookie, so they are dropped.
     */
    sessionCookieFrom(res: Response): string | null {
      const name = config.sessionCookieName?.();
      if (!name) return null;
      for (const header of res.headers.getSetCookie()) {
        const pair = header.split(";")[0]?.trim();
        if (pair?.startsWith(`${name}=`)) return pair;
      }
      return null;
    },
  };
}
