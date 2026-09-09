// @digitaltwin/auth — the runtime-agnostic half.
//
// Everything reachable from this entry point runs anywhere: an edge proxy, a Node server, a test.
// The Next adapter lives behind `@digitaltwin/auth/next` and is NOT re-exported here, deliberately.
// A barrel that offered both would let a client component or an edge bundle pull `next/headers`
// and `server-only` in by importing the package name — the exact failure the folder layout in the
// consuming app avoided by having no barrel at all.
export {
  createJwt,
  DEFAULT_ACCESS_COOKIE,
  DEFAULT_ACCESS_TTL_S,
  DEFAULT_REFRESH_COOKIE,
  DEFAULT_REFRESH_TTL_S,
  type Jwt,
  type JwtConfig,
  type Principal,
  type RefreshClaims,
  type Session,
  type TokenType,
} from "./jwt.js";

export { createMemoryTokenStore, type TokenStore } from "./token-store.js";

export {
  createInstanceGuard,
  InMemoryStoreNotAllowedError,
  type InstanceGuard,
  type InstanceGuardConfig,
} from "./instance-guard.js";
