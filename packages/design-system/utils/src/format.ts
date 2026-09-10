// utils/format.ts — number and date formatting with the locale stated, never inferred.
//
// `Number.prototype.toLocaleString()` and `Date.prototype.toLocaleDateString()` with no locale
// read whichever locale the HOST is set to. In a React app that is wrong twice over:
//
//   · the server render and the browser render can resolve DIFFERENT locales, so the same value
//     produces different markup on each side and React reports a hydration mismatch;
//   · a test asserting "1,234" passes on an en-US machine and fails on a vi-VN one, on the same
//     commit, which is how this was found.
//
// So every function here takes a locale. `DEFAULT_LOCALE` is a deliberate, stated fallback rather
// than the machine's — a shared library must render the same everywhere until an app says
// otherwise, and the app is the only layer that knows who is reading.

/** Stated, not inferred. Pass a real locale wherever a user is involved. */
export const DEFAULT_FORMAT_LOCALE = "en-US";

// Intl formatters are expensive to construct and cheap to reuse, and constructing one per render
// of a chart tooltip is a measurable cost.
//
// BOUNDED, because the keys are not: `locale` arrives from a route segment, a user profile or an
// Accept-Language header, and `options` can vary per row. An unbounded map then leaks one Intl
// formatter per combination for the lifetime of an SSR process. A small cap keeps the hit rate
// that matters — a table or a chart reuses one or two shapes — and gives up nothing else.
const CACHE_LIMIT = 64;
const cache = new Map<string, Intl.NumberFormat>();

/** Stable regardless of the order a caller wrote the options in. */
function cacheKey(locale: string, options: Intl.NumberFormatOptions): string {
  const entries = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return `${locale}:${JSON.stringify(entries)}`;
}

function numberFormatter(locale: string, options: Intl.NumberFormatOptions) {
  const key = cacheKey(locale, options);
  const cached = cache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, options);
  if (cache.size >= CACHE_LIMIT) {
    // Drop the oldest. A Map iterates in insertion order, so this is FIFO rather than LRU —
    // enough to bound the memory, and the working set of a page is far below the cap anyway.
    for (const oldest of cache.keys()) {
      cache.delete(oldest);
      break;
    }
  }
  cache.set(key, formatter);
  return formatter;
}

export type FormatNumberOptions = Intl.NumberFormatOptions & { locale?: string };

/**
 * Format a number for display.
 *
 * Non-numbers pass through as `String(value)` rather than throwing: the common caller is a chart
 * or a table cell rendering whatever the data layer produced, and a formatting helper is the wrong
 * place to take a page down over one unexpected cell.
 */
export function formatNumber(value: unknown, options: FormatNumberOptions = {}): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  const { locale = DEFAULT_FORMAT_LOCALE, ...intlOptions } = options;

  try {
    return numberFormatter(locale, intlOptions).format(value);
  } catch {
    // `Intl.NumberFormat` THROWS on a malformed locale tag or an impossible option combination:
    // `en_US` (the underscore form a backend commonly emits), an empty string, or
    // minimumFractionDigits above maximumFractionDigits. The locale is exactly what an app
    // forwards from a route segment or an Accept-Language header, and this function is called
    // during render — so an unguarded RangeError takes the page down over one cell, which is
    // precisely the outcome the non-number branch above exists to avoid.
    //
    // Falling back to the stated default keeps the number readable and keeps the promise.
    if (locale !== DEFAULT_FORMAT_LOCALE) {
      try {
        return numberFormatter(DEFAULT_FORMAT_LOCALE, intlOptions).format(value);
      } catch {
        // The options are the problem, not the locale.
      }
    }
    return new Intl.NumberFormat(DEFAULT_FORMAT_LOCALE).format(value);
  }
}

/** A compact form for dense UI: 1234 → "1.2K". Same locale rule as above. */
export function formatCompactNumber(
  value: unknown,
  options: FormatNumberOptions = {},
): string {
  return formatNumber(value, { notation: "compact", ...options });
}
