// @digitaltwin/api/rtk — RTK Query base query with 401 → refresh → retry.
//
// The RTK adapter over the package root's single-flight core, and a separate subpath so that an
// app without a Redux store gets the refresh policy without paying for @reduxjs/toolkit. The
// dependency is an OPTIONAL peer for the same reason.
//
// Nothing app-specific is baked in. The BFF path, the refresh endpoint and what to do when the
// refresh itself fails are all configuration, because the next app to use this may sign in at a
// different URL, or want a toast instead of a hard navigation.
import {
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import { createSingleFlight } from "./single-flight.js";

export type ReauthBaseQueryConfig = {
  /** Same-origin BFF root. Cookies ride along, so this is normally a path, not an origin. */
  baseUrl: string;
  /** Endpoint that rotates the cookie, relative to `baseUrl`. */
  refreshPath: string;
  /** Called when the refresh itself fails. The session is gone; the app decides what that looks like. */
  onAuthFailure: () => void;
  /**
   * Left at "include" deliberately, and not widened to `RequestCredentials`. The whole cookie-only
   * model depends on the browser attaching an HttpOnly cookie to a SAME-ORIGIN request; making
   * this configurable is an invitation to send it cross-origin.
   */
  credentials?: "include" | "same-origin";
};

export type ReauthBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
>;

/** What one refresh attempt concluded — see the branches in the returned base query. */
type RefreshOutcome =
  /** The cookie rotated. Retry the original request. */
  | "refreshed"
  /** The refresh endpoint said no. The session is genuinely gone. */
  | "rejected"
  /** The refresh never got an answer. Nobody knows whether the session is valid. */
  | "unavailable";

/**
 * Is this error a 401/403 from the server?
 *
 * `error.status === 401` alone is not enough, and the gap is not theoretical. `fetchBaseQuery`
 * defaults to `responseHandler: "json"` and parses the body BEFORE it looks at the status, so a
 * 401 whose body is HTML or plain text — the normal shape once nginx, a WAF or Cloudflare sits in
 * front of the BFF — arrives as `{ status: "PARSING_ERROR", originalStatus: 401 }` and never
 * matches. The whole refresh flow then silently does not run.
 */
function isUnauthorized(error: FetchBaseQueryError | undefined): boolean {
  if (!error) return false;
  const status =
    typeof error.status === "number"
      ? error.status
      : "originalStatus" in error
        ? error.originalStatus
        : undefined;
  return status === 401 || status === 403;
}

export function createReauthBaseQuery(config: ReauthBaseQueryConfig): ReauthBaseQuery {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl: config.baseUrl,
    credentials: config.credentials ?? "include",
  });

  type BaseQueryArgs = Parameters<ReauthBaseQuery>;

  /**
   * SCOPE. The wrapper is created here, per `createReauthBaseQuery()` call — NOT once per tab.
   *
   * That matters, and getting the scope wrong is the failure this whole module exists to prevent.
   * An app that builds two `createApi` slices (the normal way to split a large API) calls this
   * factory twice and gets two independent flights: a page mounting hooks from both slices 401s in
   * both, each runs its own refresh, the second presents a `jti` the first already burned, and
   * reuse detection revokes the family. Share ONE base query across slices, or pass the same
   * instance to both.
   *
   * Even one instance dedupes within a tab only. Two tabs share a cookie and can still race each
   * other; fixing that needs cross-tab coordination (BroadcastChannel or a lock).
   */
  const refreshOnce = createSingleFlight(
    async (api: BaseQueryArgs[1], extra: BaseQueryArgs[2]): Promise<RefreshOutcome> => {
      const res = await rawBaseQuery(
        { url: config.refreshPath, method: "POST" },
        // A FRESH abort signal, deliberately not the caller's. `api.signal` belongs to whichever
        // single query happened to trigger the refresh; RTK Query aborts it when that query's
        // cache entry is collected. Since every other waiter shares this one request, the first
        // caller unmounting would otherwise cancel the refresh for all of them and log out a
        // session that was still perfectly valid.
        { ...api, signal: new AbortController().signal },
        extra,
      );

      if (!res.error) return "refreshed";
      // Only the refresh endpoint answering 401/403 means the session is gone. A dropped socket,
      // a timeout or a 502 mean nobody knows yet, and must not sign anyone out.
      return isUnauthorized(res.error) ? "rejected" : "unavailable";
    },
  );

  /**
   * Fired once per failed refresh, not once per waiter.
   *
   * Four hooks that 401 together all join one flight and all receive the same outcome, so an
   * unguarded call meant four `location.assign` calls or four stacked toasts for one event.
   */
  let notified = false;
  function signalAuthFailure() {
    if (notified) return;
    notified = true;
    config.onAuthFailure();
  }

  return async function baseQueryWithReauth(args, api, extra) {
    const result = await rawBaseQuery(args, api, extra);
    if (!isUnauthorized(result.error)) return result;

    const outcome = await refreshOnce(api, extra);

    if (outcome === "refreshed") {
      const retried = await rawBaseQuery(args, api, extra); // cookie rotated → retry
      if (!isUnauthorized(retried.error)) return retried;

      // Still 401 AFTER a successful rotation. Refreshing again cannot help: the token is fine
      // and the answer is still no — a changed role or tenant claim, clock skew, or a backend
      // that says 401 where it means 403. Without this branch every request loops
      // refresh → retry → 401 forever, burning one rotation per request and never signing the
      // user out; two tabs doing it concurrently trip a family revoke.
      signalAuthFailure();
      return retried;
    }

    // A refresh that failed for TRANSPORT reasons says nothing about the session. Reporting it as
    // a dead session hard-navigates a user whose cookie is still perfectly valid — mid-form, on a
    // two-second wifi drop or a rolling deploy.
    if (outcome === "rejected") signalAuthFailure();
    return result;
  };
}
