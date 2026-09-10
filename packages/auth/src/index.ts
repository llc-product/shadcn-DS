// @digitaltwin/auth — cookie-only session for a BACKEND-OWNED session.
//
// The backend issues the session and owns its lifetime: it answers sign-in with its own
// `Set-Cookie`, rotates it when it likes, and expires it when it likes. This package signs
// nothing and verifies nothing. What it does is hold that cookie where a browser cannot reach it.
//
// WHY THE BACKEND'S COOKIE NEVER REACHES THE BROWSER. The backend is internal, so its cookie is
// scoped to a host the browser never talks to and would be rejected on arrival. Forwarding it
// would also mean rewriting its Domain attribute — the kind of quiet edit that turns a session
// cookie into a cross-site one. So the value is stored inside THIS app's own HttpOnly cookie and
// replayed server-side on every backend call, which is what `@digitaltwin/api` does with it.
//
// The Next adapter lives behind `@digitaltwin/auth/next` and is NOT re-exported here: a barrel
// offering both would let a client component or an edge bundle pull `next/headers` in by
// importing the package name.
export { UnauthorizedError, type Session } from "./session.js";
