// @digitaltwin/types — the contracts more than one app needs to agree on.
//
// Types only, no runtime. The package still builds to `dist` rather than shipping raw `.ts`,
// because a consumer's compiler settings are not this package's to assume — `verbatimModuleSyntax`
// and `isolatedModules` in particular change what a bare `.ts` file is allowed to mean.
//
// The bar for adding something here is that two codebases would otherwise define it separately and
// drift. A type used by one app belongs in that app.

/**
 * The envelope every list endpoint returns.
 *
 * `total` is the count BEFORE paging, which is what a pager needs and what a naive
 * `data.length` gets wrong on every page but the last.
 */
export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

/**
 * What a mutation hands back to a form.
 *
 * A discriminated union, not `{ data?, errors? }`: the union makes the impossible states
 * unrepresentable, so a caller cannot read `data` without having checked `ok` first.
 *
 * `errors` is keyed by field name and its values may be undefined, which is the shape a schema
 * validator produces — matching it here means a form can spread the result straight in rather
 * than translating it at every call site.
 */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; errors: Record<string, string[] | undefined> };
