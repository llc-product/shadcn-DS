// @digitaltwin/api — run at most one instance of an async operation at a time.
//
// Framework-free on purpose: this is the part of the refresh flow that has nothing to do with RTK
// Query, or with fetch, or with Next, so it is what the package root exports. ./rtk is a thin
// wrapper around it.
//
// For refresh specifically this is a CORRECTNESS requirement, not a performance one. Refresh
// tokens rotate with reuse detection: using a token burns its `jti`, and presenting a burned `jti`
// is treated as theft and revokes the whole family. Two concurrent refreshes therefore log the
// user out during ordinary concurrent loading. Funnelling every caller through one in-flight
// promise makes that impossible.

/**
 * Wraps `run` so that concurrent callers share a single execution. Once it settles, the next call
 * starts a fresh one — this is not a cache.
 *
 * The wrapper forwards arguments rather than closing over them, and that is deliberate. The
 * arguments of the caller that STARTS an attempt are the ones it runs with; callers that join a
 * flight already in progress contribute nothing. Closing over them instead would pin the very
 * first caller's arguments for the lifetime of the process, which for the refresh flow means
 * retrying forever against an abort signal that was collected long ago.
 */
export function createSingleFlight<A extends unknown[], T>(
  run: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return function invoke(...args: A): Promise<T> {
    if (!inFlight) {
      inFlight = run(...args).finally(() => {
        inFlight = null; // the next call after this one starts a fresh attempt
      });
    }
    return inFlight;
  };
}
