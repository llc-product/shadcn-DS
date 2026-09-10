---
"@digitaltwin/api": minor
"@digitaltwin/auth": minor
"@digitaltwin/constants": minor
---

Move `api` and `auth` onto a backend-owned session, and make `api` one client instance.

**`@digitaltwin/api`** is now a single entry point exporting `createApiClient`, an instance with
`get` / `post` / `put` / `patch` / `delete` / `request` that runs unchanged in a browser and on a
server. `withSession()` returns a new client bound to a caller's session, so a request-scoped
session can never be written into a module-scoped client.

Removed: the `./rtk` and `./server` subpaths, `createSingleFlight`, `createReauthBaseQuery`, and
the `@reduxjs/toolkit` optional peer. They existed for a refresh flow that a backend-owned session
does not have — there is no token to rotate and no endpoint to rotate it with, so a 401 means the
session is over.

**`@digitaltwin/auth`** no longer signs or verifies anything. `createSessionHelpers` holds the
backend's opaque cookie inside this app's own HttpOnly cookie and replays it server-side. Removed:
`createJwt`, `createMemoryTokenStore`, `createInstanceGuard`, and the `jose` dependency.

**`@digitaltwin/constants`** replaces `ACCESS_COOKIE`, `REFRESH_COOKIE` and `IDENTITY_HEADERS` with
`SESSION_COOKIE` and `SESSION_TTL_S`. Nothing carries an identity between the app and the backend
any more, so there is no header name for the two ends to agree on.
