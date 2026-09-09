// @digitaltwin/auth — runtime-agnostic JWT core. jose only: no next/*, no server-only, no env.
//
// Safe to import from an edge runtime as well as a server one, which is the whole reason it is
// separate from ./next.
//
// It takes the secret and the TTLs as arguments rather than reading an environment, for three
// reasons that all matter once more than one app uses it: a package cannot know one app's env
// schema; a module-level env read makes the module impossible to instantiate twice (two issuers,
// two secrets); and it forces every test that touches signing to mock a config object it does
// not care about. @digitaltwin/config carries the schema that validates them.
import { SignJWT, jwtVerify } from "jose";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@digitaltwin/constants";

export type Session = { userId: string; role: string } | null;
export type Principal = { userId: string; role: string };

// Refresh tokens additionally carry a rotation id (`jti`) and a family id (`fam`) so the
// refresh route can rotate/revoke them and detect reuse (see ./token-store).
export type RefreshClaims = Principal & { jti: string; fam: string; exp: number };

// Access and refresh tokens share a secret, so we tag each with a `typ` claim and verify
// it — otherwise an access token could be replayed at /auth/refresh (and vice versa).
export type TokenType = "access" | "refresh";

export type JwtConfig = {
  /**
   * HMAC secret, at least 32 characters — the caller validates that, this module does not.
   *
   * A GETTER is accepted, and this app passes one. Reading the secret eagerly would move the read
   * to module-load time, and under a validated-env proxy that turns merely importing this module
   * into a throw wherever the environment is not server-shaped. Three route tests import it inside
   * jsdom purely to reach an unrelated export, and an eager read broke all three.
   */
  secret: string | (() => string);
  accessTtlS?: number;
  refreshTtlS?: number;
};

export const DEFAULT_ACCESS_TTL_S = 60 * 15; // 15m
export const DEFAULT_REFRESH_TTL_S = 60 * 60 * 24 * 7; // 7d
// Re-exported rather than redeclared: the BFF that SETS these cookies and the edge that READS
// them must say the same word, so the word lives in one package.
export const DEFAULT_ACCESS_COOKIE = ACCESS_COOKIE;
export const DEFAULT_REFRESH_COOKIE = REFRESH_COOKIE;

// Pin the algorithm allow-list rather than letting jose infer it from the key. Not exploitable
// today (a Uint8Array key already restricts jose to HMAC and rules out alg:"none"), but it makes
// the invariant explicit, so swapping in a JWK or a dependency bump cannot silently widen it.
const VERIFY_OPTS = { algorithms: ["HS256"] };

// `payload.role` is `unknown` at runtime — jose returns whatever was signed. The old code wrote
// `(payload.role as string) ?? ""`, which is two bugs in one expression: the cast asserts a type
// nothing checked, and `??` only catches null/undefined, so a numeric or object role flowed
// straight through typed as `string`. Downstream that is not theoretical — `backendHeaders()`
// puts `session.role` into an outbound header, where an object would serialise to
// "[object Object]" and a bug in the signer would surface as a confusing backend error rather
// than a rejected token.
//
// Only the holder of the secret can mint a token, so a malformed role means our own signer is wrong, not
// that an attacker got in. Both branches are still deny-by-default:
//   absent            → "" (no role claim is a legitimate shape; "" matches no role set)
//   present, non-string → reject the whole token (a shape we never mint; refuse to guess)
const ROLE_INVALID = Symbol("role-invalid");
function readRole(role: unknown): string | typeof ROLE_INVALID {
  if (role === undefined || role === null) return "";
  return typeof role === "string" ? role : ROLE_INVALID;
}

export type Jwt = ReturnType<typeof createJwt>;

export function createJwt(config: JwtConfig) {
  const readSecret =
    typeof config.secret === "function" ? config.secret : () => config.secret as string;
  // Encoded per operation rather than once, exactly as before the split: the secret is read when
  // it is used, so nothing is captured at import time.
  const secret = () => new TextEncoder().encode(readSecret());
  const accessTtlS = config.accessTtlS ?? DEFAULT_ACCESS_TTL_S;
  const refreshTtlS = config.refreshTtlS ?? DEFAULT_REFRESH_TTL_S;

  const signAccess = (p: Principal) =>
    new SignJWT({ role: p.role, typ: "access" satisfies TokenType })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(p.userId)
      .setExpirationTime(`${accessTtlS}s`)
      .sign(secret());

  // The caller supplies the rotation ids so it can record them in the token store.
  const signRefresh = (p: Principal, ids: { jti: string; fam: string }) =>
    new SignJWT({ role: p.role, typ: "refresh" satisfies TokenType, fam: ids.fam })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(p.userId)
      .setJti(ids.jti)
      .setExpirationTime(`${refreshTtlS}s`)
      .sign(secret());

  async function verifyToken(
    token: string | undefined,
    expected: TokenType = "access",
  ): Promise<Session> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, secret(), VERIFY_OPTS);
      if (payload.typ !== expected) return null; // wrong token type → reject
      if (!payload.sub) return null; // no subject → no identity to trust
      const role = readRole(payload.role);
      if (role === ROLE_INVALID) return null;
      return { userId: payload.sub, role };
    } catch {
      return null;
    }
  }

  // Refresh-token verification that also surfaces the rotation claims (jti/fam/exp).
  async function verifyRefresh(token: string | undefined): Promise<RefreshClaims | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, secret(), VERIFY_OPTS);
      if (payload.typ !== "refresh" || !payload.sub) return null;
      if (typeof payload.jti !== "string" || typeof payload.fam !== "string") return null;
      if (typeof payload.exp !== "number") return null;
      const role = readRole(payload.role);
      if (role === ROLE_INVALID) return null;
      return {
        userId: payload.sub,
        role,
        jti: payload.jti,
        fam: payload.fam,
        exp: payload.exp,
      };
    } catch {
      return null;
    }
  }

  return { signAccess, signRefresh, verifyToken, verifyRefresh, accessTtlS, refreshTtlS };
}
