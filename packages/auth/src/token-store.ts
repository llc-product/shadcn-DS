// @digitaltwin/auth — refresh-token revocation with reuse detection.
//
// Refresh tokens rotate: each use mints a new token (new `jti`) in the same family (`fam`) and
// revokes the old `jti`. If a REVOKED jti is ever presented again, that means the token was
// replayed (stolen) → we revoke the whole family, forcing re-auth. This is the standard
// "refresh token rotation with automatic reuse detection" pattern (RFC 6819 / OAuth BCP).
//
// `TokenStore` is the contract, and it is the point of this file. The in-memory implementation
// below is PER-INSTANCE: state is lost on redeploy (users simply re-authenticate) and is not
// shared across processes. A deployment that needs more implements the same three methods against
// Redis or a database and passes that in instead — nothing above this file changes.

/**
 * UNITS. Every expiry here is unix MILLISECONDS, and that is worth stating loudly because the only
 * value a caller has to hand is `RefreshClaims.exp`, which a JWT carries in SECONDS. Passing it
 * unconverted stores ~1.8e9 against a `Date.now()` of ~1.8e12, so `prune()` deletes the entry on
 * the very next lookup — and reuse detection then never fires. A stolen refresh token replayed a
 * second after the legitimate rotation finds an empty map, is accepted, and mints a session.
 * Nothing errors and nothing logs: the exact fail-open the whole rotation design exists to
 * prevent, and both types are `number`, so no compiler will catch it. Convert at the call site:
 * `store.revokeJti(claims.jti, claims.exp * 1000)`.
 */
export type TokenStore = {
  /** Is this token no longer usable (already rotated, or its family was nuked)? */
  isRevoked(jti: string, fam: string): boolean;
  /** Called on each successful rotation to burn the just-used token. */
  revokeJti(jti: string, expiresAtMs: number): void;
  /** Called on reuse detection and on logout to kill every token in the family. */
  revokeFamily(fam: string, expiresAtMs: number): void;
};

/**
 * Milliseconds since the epoch are ~1.8e12 today and seconds are ~1.8e9, so anything below this
 * threshold was a `exp` that nobody multiplied. Refusing it loudly is the only way the mistake is
 * ever seen: accepted silently it disables reuse detection and looks exactly like working code.
 */
const MIN_PLAUSIBLE_MS = 1e12;

function assertMilliseconds(expiresAtMs: number, method: string): void {
  if (expiresAtMs >= MIN_PLAUSIBLE_MS) return;
  throw new RangeError(
    `TokenStore.${method}: expiresAtMs=${expiresAtMs} looks like unix SECONDS, not milliseconds. ` +
      `A JWT's \`exp\` is in seconds — pass \`exp * 1000\`. Storing seconds silently disables ` +
      `reuse detection, because every entry prunes itself on the next lookup.`,
  );
}

/**
 * @param guard runs before every operation. The in-memory store is a security control that fails
 *   open across processes, so the caller injects the check that refuses to run it on more than
 *   one — see ./instance-guard. Pass `() => {}` for a store that is genuinely shared.
 * @param name what the guard calls this store in its error message.
 */
export function createMemoryTokenStore(
  guard: (store: string) => void,
  name = "refreshTokenStore",
): TokenStore {
  // jti/fam → unix-ms expiry. Set from the token's own `exp * 1000`, so entries self-clean at
  // the moment the token they describe dies. See the note on TokenStore about the units.
  const revokedJti = new Map<string, number>();
  const revokedFamilies = new Map<string, number>();

  function prune(now: number) {
    for (const [id, exp] of revokedJti) if (now >= exp) revokedJti.delete(id);
    for (const [id, exp] of revokedFamilies) if (now >= exp) revokedFamilies.delete(id);
  }

  return {
    isRevoked(jti, fam) {
      guard(name);
      prune(Date.now());
      return revokedJti.has(jti) || revokedFamilies.has(fam);
    },

    revokeJti(jti, expiresAtMs) {
      guard(name);
      assertMilliseconds(expiresAtMs, "revokeJti");
      revokedJti.set(jti, expiresAtMs);
    },

    revokeFamily(fam, expiresAtMs) {
      guard(name);
      assertMilliseconds(expiresAtMs, "revokeFamily");
      revokedFamilies.set(fam, expiresAtMs);
    },
  };
}
