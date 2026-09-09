// @digitaltwin/auth — refuse to run a per-process security control on many processes.
//
// The refresh-token store (./token-store) and a typical rate limiter both keep state in a plain
// Map inside ONE Node process. That is fine for local dev and for a single
// long-lived instance. It is dangerous anywhere else, because both fail OPEN and fail SILENTLY:
//
//   - Reuse detection: a stolen refresh token replayed against an instance that never saw the
//     rotation finds an empty Map, is accepted, and mints a fresh session. The defence the whole
//     rotation design exists for simply does not fire, and nothing logs or errors.
//   - Rate limiting: N instances means N separate buckets, so the effective limit is N × limit.
//
// Nothing about a second instance is detectable at runtime, so the only safe default is to make
// the operator say out loud that there is exactly one.
//
// The two predicates are FUNCTIONS, not values, on purpose: the guard is asked at call time, so a
// deployment that flips the acknowledgement does not need a restart to be re-read, and the tests
// can drive it without re-importing the module.
//
// The consuming app is the wiring that supplies its own env var name and its remedy text.

export class InMemoryStoreNotAllowedError extends Error {
  constructor(store: string, remedy: string) {
    super(
      `${store} is a per-process in-memory store and cannot be trusted in production. ${remedy}`,
    );
    this.name = "InMemoryStoreNotAllowedError";
  }
}

export type InstanceGuardConfig = {
  isProduction: () => boolean;
  /** Has the operator acknowledged that this deployment runs exactly one instance? */
  singleInstanceAcknowledged: () => boolean;
  /** How the operator fixes it, in their own vocabulary — env var names differ per app. */
  remedy: string;
};

export type InstanceGuard = (store: string) => void;

// Throws in production unless single-instance operation has been explicitly acknowledged.
// Deliberately loud: a broken security control should stop the deployment, not pass unnoticed.
export function createInstanceGuard(config: InstanceGuardConfig): InstanceGuard {
  return function assertInMemoryStoreAllowed(store: string): void {
    if (!config.isProduction()) return;
    if (config.singleInstanceAcknowledged()) return;
    throw new InMemoryStoreNotAllowedError(store, config.remedy);
  };
}
