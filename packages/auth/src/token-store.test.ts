// @vitest-environment node
//
// Rotation with reuse detection. The behaviour worth pinning is not "a revoked token is revoked" —
// it is that presenting a BURNED jti takes down the whole family, because that is the difference
// between detecting a stolen token and merely expiring one.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInstanceGuard, InMemoryStoreNotAllowedError } from "./instance-guard";
import { createMemoryTokenStore, type TokenStore } from "./token-store";

const noGuard = () => {};
const future = () => Date.now() + 60_000;

let store: TokenStore;
beforeEach(() => {
  // A fresh store per test: the Maps live in the closure, so a shared one leaks revocations.
  store = createMemoryTokenStore(noGuard);
});

describe("createMemoryTokenStore", () => {
  it("reports an untouched token as usable", () => {
    expect(store.isRevoked("jti-1", "fam-1")).toBe(false);
  });

  it("burns a jti on rotation", () => {
    store.revokeJti("jti-1", future());
    expect(store.isRevoked("jti-1", "fam-1")).toBe(true);
  });

  it("takes down the whole family, not just the token, on reuse", () => {
    // The point of the design: a replayed token means the family is compromised, so every sibling
    // has to die too, including ones this process has never seen.
    store.revokeFamily("fam-1", future());
    expect(store.isRevoked("never-seen-jti", "fam-1")).toBe(true);
  });

  it("leaves other families alone", () => {
    store.revokeFamily("fam-1", future());
    expect(store.isRevoked("jti-2", "fam-2")).toBe(false);
  });

  it("forgets an entry once the token it describes would have expired anyway", () => {
    // Entries self-clean at the token's own exp: keeping them longer is a memory leak, dropping
    // them sooner would accept a replayed token that is still valid.
    const past = Date.now() - 1; // still milliseconds, just already elapsed
    store.revokeJti("jti-1", past);
    store.revokeFamily("fam-1", past);
    expect(store.isRevoked("jti-1", "fam-1")).toBe(false);
  });

  it("REFUSES an expiry that is plainly unix seconds rather than milliseconds", () => {
    // The failure this prevents is silent and total. A JWT's `exp` is in seconds; stored
    // unconverted it is ~1.8e9 against a Date.now() of ~1.8e12, so prune() drops the entry on the
    // very next lookup and reuse detection never fires again. Both are `number`, so no compiler
    // catches it, and the code looks like it works.
    const secondsExp = Math.floor(Date.now() / 1000) + 60;

    expect(() => store.revokeJti("jti-1", secondsExp)).toThrow(RangeError);
    expect(() => store.revokeJti("jti-1", secondsExp)).toThrow(/seconds/i);
    expect(() => store.revokeFamily("fam-1", secondsExp)).toThrow(RangeError);

    // …and nothing was written, so a caller that swallows the error does not end up with a store
    // that silently forgot the revocation.
    expect(store.isRevoked("jti-1", "fam-1")).toBe(false);
  });

  it("accepts the same value once it is converted", () => {
    const secondsExp = Math.floor(Date.now() / 1000) + 60;
    store.revokeJti("jti-1", secondsExp * 1000);
    expect(store.isRevoked("jti-1", "fam-1")).toBe(true);
  });

  it("asks the guard before every operation, not just on construction", () => {
    const guard = vi.fn();
    const guarded = createMemoryTokenStore(guard, "refreshTokenStore");

    guarded.isRevoked("a", "b");
    guarded.revokeJti("a", future());
    guarded.revokeFamily("b", future());

    expect(guard).toHaveBeenCalledTimes(3);
    expect(guard).toHaveBeenCalledWith("refreshTokenStore");
  });

  it("refuses to work at all when the guard throws", () => {
    const guard = createInstanceGuard({
      isProduction: () => true,
      singleInstanceAcknowledged: () => false,
      remedy: "Back it with a shared store.",
    });
    const guarded = createMemoryTokenStore(guard, "refreshTokenStore");

    // Loud, not silent: a security control that fails open across instances must stop the
    // deployment rather than quietly stop detecting theft.
    expect(() => guarded.isRevoked("a", "b")).toThrow(InMemoryStoreNotAllowedError);
    expect(() => guarded.revokeJti("a", future())).toThrow(/refreshTokenStore/);
  });
});

describe("createInstanceGuard", () => {
  const guard = (production: boolean, acknowledged: boolean) =>
    createInstanceGuard({
      isProduction: () => production,
      singleInstanceAcknowledged: () => acknowledged,
      remedy: 'set ALLOW_IN_MEMORY_AUTH_STORE="true"',
    });

  it("allows the in-memory store outside production", () => {
    expect(() => guard(false, false)("refreshTokenStore")).not.toThrow();
  });

  it("throws in production until single-instance operation is acknowledged", () => {
    expect(() => guard(true, false)("refreshTokenStore")).toThrow(
      InMemoryStoreNotAllowedError,
    );
    expect(() => guard(true, true)("refreshTokenStore")).not.toThrow();
  });

  it("names the offending store and the remedy so the failure is actionable", () => {
    expect(() => guard(true, false)("rateLimit")).toThrow(/rateLimit/);
    expect(() => guard(true, false)("rateLimit")).toThrow(/ALLOW_IN_MEMORY_AUTH_STORE/);
  });

  it("asks its predicates at call time, so a flipped acknowledgement needs no restart", () => {
    let acknowledged = false;
    const assert = createInstanceGuard({
      isProduction: () => true,
      singleInstanceAcknowledged: () => acknowledged,
      remedy: "…",
    });

    expect(() => assert("store")).toThrow();
    acknowledged = true;
    expect(() => assert("store")).not.toThrow();
  });
});
