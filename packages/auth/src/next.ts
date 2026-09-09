// @digitaltwin/auth/next — SERVER-side auth glue: HttpOnly cookies + redirect, on top of the
// runtime-agnostic JWT core at the package root. Cookie-only model: the browser never sees a token in
// JS; cookies ride along automatically (same origin).
//
// This module imports `next/*` and `server-only`, which is exactly why it is a separate subpath:
// the package's `exports` map offers no way to reach it from the root, so an edge bundle or a
// client component cannot pull next/headers in by importing the package name.
//
// What it must NOT know is anything about one app's routing or i18n. `onUnauthenticatedPage` is
// injected for that reason: a bare "/signin" is not a real route in an app whose every page lives
// under /[locale], and the next app to use this may have no locales at all.
import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Session, TokenType } from "./jwt.js";

// Thrown by assertSession() so a route handler can answer 401 instead of redirecting.
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type SessionConfig = {
  verifyToken: (token: string | undefined, expected?: TokenType) => Promise<Session>;
  cookieNames: { access: string; refresh: string };
  ttlS: { access: number; refresh: number };
  /**
   * What to do when a PAGE render finds no session. The app calls Next's `redirect()` itself
   * rather than handing this module a path string, and that is deliberate: `typedRoutes: true`
   * checks the route where it is WRITTEN, and a path laundered through a `() => string` config
   * arrives here as plain text that nothing can verify. Passing the action keeps the check at the
   * app's call site, and keeps `next/navigation` out of this module entirely.
   */
  onUnauthenticatedPage: () => Promise<never> | never;
  /** Defaults to "only over HTTPS in production". */
  isSecure?: () => boolean;
};

export function createSessionHelpers(config: SessionConfig) {
  const { verifyToken, cookieNames, ttlS } = config;
  const isSecure = config.isSecure ?? (() => process.env.NODE_ENV === "production");

  // Real verification — invalid/expired/missing access token → null (deny-by-default).
  //
  // "access" is passed EXPLICITLY, not left to the default. The `typ` claim exists so a refresh
  // token cannot be replayed as an access token, and relying on a default puts that guarantee
  // inside a function this module does not own: any injected `verifyToken` that drops the default
  // — a test double, an adapter, a second implementation written against the published
  // `SessionConfig` where `expected?` reads as "optional, ignore it" — would accept a 7-day
  // refresh token out of the access cookie. Both cookies are set on the same path, so that is a
  // 15-minute session turned into a 7-day one.
  async function getSession(): Promise<Session> {
    return verifyToken((await cookies()).get(cookieNames.access)?.value, "access");
  }

  // Defense-in-depth for the data layer when rendering a PAGE (RSC): no session → send the user
  // to sign-in. Only valid where a redirect is a sensible answer, i.e. during page rendering.
  async function requireSession(): Promise<NonNullable<Session>> {
    const session = await getSession();
    if (session) return session;

    await config.onUnauthenticatedPage();
    // Unreachable: redirect() throws. The throw is what tells the compiler the function cannot
    // fall through with a null session.
    throw new UnauthorizedError();
  }

  // The same guard for ROUTE HANDLERS. A redirect from a handler answers 307, and a fetch client
  // follows it and gets HTML, so the client never sees the 401 that triggers its refresh-and-retry.
  // Handlers catch this and return 401 (see app/api/users/route.ts).
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

  // Set both auth cookies on a response (used by dev-login + refresh routes).
  function setAuthCookies(
    res: NextResponse,
    tokens: { access: string; refresh: string },
  ) {
    const base = cookieBase();
    res.cookies.set(cookieNames.access, tokens.access, {
      ...base,
      maxAge: ttlS.access,
    });
    res.cookies.set(cookieNames.refresh, tokens.refresh, {
      ...base,
      maxAge: ttlS.refresh,
    });
  }

  // Clear both auth cookies (used by logout + on refresh-token reuse detection).
  function clearAuthCookies(res: NextResponse) {
    const base = cookieBase();
    res.cookies.set(cookieNames.access, "", { ...base, maxAge: 0 });
    res.cookies.set(cookieNames.refresh, "", { ...base, maxAge: 0 });
  }

  return {
    getSession,
    requireSession,
    assertSession,
    setAuthCookies,
    clearAuthCookies,
  };
}
