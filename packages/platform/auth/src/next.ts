// @digitaltwin/auth/next — SERVER-side session plumbing, on top of the runtime-agnostic half.
//
// This module imports `next/*` and `server-only`, which is exactly why it is a separate subpath:
// the package's `exports` map offers no way to reach it from the root, so an edge bundle or a
// client component cannot pull `next/headers` in by importing the package name.
//
// What it must NOT know is anything about one app's routing or i18n. `onUnauthenticatedPage` is
// injected for that reason: a bare "/signin" is not a real route in an app whose every page lives
// under /[locale], and the next app to use this may have no locales at all.
import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { UnauthorizedError, type Session } from "./session.js";

export type SessionConfig = {
  /** Name of THIS app's cookie — the wrapper, not the backend's own. */
  cookieName: string;
  /**
   * How long the browser holds the wrapper. Set no shorter than the backend's own session, so the
   * backend is what decides when a session ends rather than this app expiring it early.
   */
  ttlS: number;
  /**
   * What to do when a PAGE render finds no session. The app calls Next's `redirect()` itself
   * rather than handing this module a path string: `typedRoutes: true` checks the route where it
   * is WRITTEN, and a path laundered through a `() => string` config arrives here as plain text
   * that nothing can verify. Passing the action keeps the check at the app's call site, and keeps
   * `next/navigation` out of this module entirely.
   */
  onUnauthenticatedPage: () => Promise<never> | never;
  /** Defaults to "only over HTTPS in production". */
  isSecure?: () => boolean;
};

export function createSessionHelpers(config: SessionConfig) {
  const isSecure = config.isSecure ?? (() => process.env.NODE_ENV === "production");

  /**
   * Is a session being held? Presence only — see the note on `Session`.
   *
   * An empty string counts as absent: that is what a cleared cookie looks like before the browser
   * drops it, and sending `Cookie: ` onward would be a request with no session dressed up as one
   * that has one.
   */
  async function getSession(): Promise<Session> {
    const value = (await cookies()).get(config.cookieName)?.value;
    return value ? { backendCookie: value } : null;
  }

  /**
   * The guard for a PAGE render (RSC): no session → send the visitor to sign-in.
   *
   * Only valid where a redirect is a sensible answer. A route handler wants `assertSession`.
   */
  async function requireSession(): Promise<NonNullable<Session>> {
    const session = await getSession();
    if (session) return session;

    await config.onUnauthenticatedPage();
    // Unreachable: redirect() throws. The throw is what tells the compiler the function cannot
    // fall through with a null session — and what stops a hook that forgets to throw from letting
    // a caller carry on with one.
    throw new UnauthorizedError();
  }

  /**
   * The same guard for ROUTE HANDLERS.
   *
   * A redirect from a handler answers 307, and a fetch client follows it and receives HTML — so
   * the client never sees the 401 that drives its sign-out.
   */
  async function assertSession(): Promise<NonNullable<Session>> {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    return session;
  }

  const cookieBase = () => ({
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: isSecure(),
    path: "/",
  });

  /** Store the backend's session value. Called after sign-in, and again whenever it rotates. */
  function setSessionCookie(res: NextResponse, backendCookie: string) {
    res.cookies.set(config.cookieName, backendCookie, {
      ...cookieBase(),
      maxAge: config.ttlS,
    });
  }

  /**
   * Expire it. Same attributes it was set with, deliberately: a browser drops a cookie only when
   * the expiring `Set-Cookie` matches on name, path and the rest, so clearing with a different
   * shape leaves the original in place and the user stays signed in after pressing sign out.
   */
  function clearSessionCookie(res: NextResponse) {
    res.cookies.set(config.cookieName, "", { ...cookieBase(), maxAge: 0 });
  }

  return {
    getSession,
    requireSession,
    assertSession,
    setSessionCookie,
    clearSessionCookie,
  };
}

export { UnauthorizedError, type Session } from "./session.js";
