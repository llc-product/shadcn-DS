// @digitaltwin/config — the environment each @digitaltwin package needs, as schema fragments.
//
// SCHEMA ONLY. There is no `createEnv` call here, and that is the whole design of this package.
// Validating an environment is a framework-bound job: @t3-oss/env-nextjs knows about Next's
// client/server split and its build-time inlining, and a package that called it would drag Next
// into every consumer, including the ones that are not Next apps.
//
// So the split is: this package owns WHAT each variable must look like, because that follows from
// what `@digitaltwin/auth` and `@digitaltwin/api` actually do with it. The app owns WHEN it is
// validated and HOW it is read.
//
// An app composes them:
//
//   export const env = createEnv({
//     server: { ...authEnv, ...backendEnv, ...siteEnv, MY_OWN_VAR: z.string() },
//     client: {},
//     runtimeEnv: { JWT_SECRET: process.env.JWT_SECRET, ... },
//   });
//
// `runtimeEnv` stays hand-written in the app on purpose. It must name `process.env.X` literally,
// or a bundler that inlines environment variables at build time has nothing to inline.
import { z } from "zod";

/** What `@digitaltwin/auth` needs to sign and verify tokens. */
export const authEnv = {
  // The length is the security property, not a style rule: HS256 with a short secret is brute
  // forceable offline, and nothing at runtime would ever tell you.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  // Explicit acknowledgement that the in-memory refresh-token store and rate limiter run on
  // exactly ONE instance. They are per-process, so on a second instance reuse detection and rate
  // limits silently stop working. Optional here, required by the guard in production.
  ALLOW_IN_MEMORY_AUTH_STORE: z.enum(["true", "false"]).optional(),
};

/**
 * An http(s) URL, not merely "something zod's url() accepts".
 *
 * `z.url()` alone passes anything with a scheme, so `localhost:4000` and `backend:4000` both
 * validate — zod reads the host as the scheme. Either one then fails inside `fetch` at the first
 * request, with an error that names neither the variable nor the value. Pinning the protocol moves
 * that failure to boot, which is the entire reason for validating an environment.
 */
const httpUrl = z.url({ protocol: /^https?$/ });

/** What `@digitaltwin/api`'s server half needs to reach an internal backend. */
export const backendEnv = {
  API_INTERNAL_URL: httpUrl,

  // Optional shared credential the BFF presents to the internal backend so the backend can trust
  // the forwarded identity headers. Absent means the backend authenticates the BFF another way
  // (mTLS, network policy) — it does not mean the headers are unauthenticated.
  API_SERVICE_TOKEN: z.string().min(1).optional(),
};

/** What anything emitting absolute URLs needs: robots.txt, sitemap.xml, e-mail links. */
export const siteEnv = {
  // SERVER-side deliberately: only server code needs it, and a build-time-inlined public variable
  // would mean the same built image could not be promoted between environments.
  //
  // Named SITE_URL, not BASE_URL: Vite sets process.env.BASE_URL="/" under Vitest, which fails a
  // url() check in tests only, for reasons nothing in an app explains.
  SITE_URL: httpUrl.default("http://localhost:3000"),
};

/** Everything the @digitaltwin packages need, for an app that uses all of them. */
export const digitaltwinEnv = {
  ...authEnv,
  ...backendEnv,
  ...siteEnv,
};
