// @digitaltwin/constants — values that two codebases must agree on exactly.
//
// The bar for adding something here is narrow and worth stating, because a constants package with
// no criterion becomes a junk drawer: a value belongs here when a MISMATCH between two codebases
// would be a bug rather than a preference. A cookie name is one — the BFF that sets it and the
// edge that reads it must say the same word or auth silently fails. A default page size is not.
//
// Every value is also a default, not a mandate. The packages that use them take them as
// configuration, so an app with a different backend overrides rather than forks.

/**
 * The app's own session cookie — the WRAPPER holding the backend's opaque cookie, not the
 * backend's own.
 *
 * It clears the bar: the route that sets it and the edge proxy that reads it must say the same
 * word, in bundles that share no code, or auth silently fails for everyone.
 *
 * HttpOnly, so nothing in JS ever reads it.
 */
export const SESSION_COOKIE = "session";

/**
 * Seven days. Longer than the backend's own session is expected to be, on purpose: the backend
 * decides when a session ends, and a shorter wrapper here would sign people out early for reasons
 * nothing on the backend could explain.
 */
export const SESSION_TTL_S = 60 * 60 * 24 * 7;
