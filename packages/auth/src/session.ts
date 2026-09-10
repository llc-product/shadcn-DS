// @digitaltwin/auth — the runtime-agnostic half: what a session IS, and what its absence throws.
//
// Deliberately tiny, and deliberately free of imports. An edge proxy that only needs to know
// whether a request carries a session must be able to reach these two without pulling
// `next/headers` or `server-only` into a bundle that may contain neither — which is the whole
// reason the Next adapter lives behind `@digitaltwin/auth/next` and is not re-exported here.

/**
 * A session this app is holding on the caller's behalf.
 *
 * It carries the backend's own cookie and nothing else. There is deliberately no `userId` or
 * `role`: the value is opaque — no signature, no claims, no expiry this app can read — and
 * inventing a field for an identity would invite code that trusts a copy nobody refreshes.
 *
 * What follows from that is worth stating rather than discovering: presence is the only question
 * answerable without a network round trip. A session the backend has already expired still looks
 * present, and is found out when a real call answers 401. That is the price of having ONE source
 * of truth for who is signed in instead of two.
 */
export type Session = { backendCookie: string } | null;

/** Thrown by `assertSession()` so a route handler can answer 401 instead of redirecting. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
