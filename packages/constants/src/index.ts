// @digitaltwin/constants — values that two codebases must agree on exactly.
//
// The bar for adding something here is narrow and worth stating, because a constants package with
// no criterion becomes a junk drawer: a value belongs here when a MISMATCH between two codebases
// would be a bug rather than a preference. A cookie name is one — the BFF that sets it and the
// edge that reads it must say the same word or auth silently fails. A default page size is not.
//
// Every value is also a default, not a mandate. The packages that use them take them as
// configuration, so an app with a different backend overrides rather than forks.

/** Cookie the browser carries; HttpOnly, so nothing in JS ever reads it. */
export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/**
 * Headers the BFF uses to forward a VERIFIED identity to an internal backend.
 *
 * The backend may trust these only because they arrive from the BFF over a trusted network. They
 * are named here so both ends read the same list; the values are never caller-supplied.
 */
export const IDENTITY_HEADERS = {
  userId: "x-user-id",
  role: "x-user-role",
} as const;

/** Locales the apps ship. The first is the default. */
export const LOCALES = ["en", "es", "vi", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
