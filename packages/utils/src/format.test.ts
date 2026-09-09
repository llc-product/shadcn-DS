// The point of this file: prove the formatters do NOT follow the machine's locale.
//
// The bug it exists for shipped in a chart tooltip — `value.toLocaleString()` with no locale —
// and was invisible until the suite ran on a machine set to vi-VN, where "1,234" came out
// "1.234". A test that asserts a formatted string is only meaningful if the locale is pinned.
import { describe, expect, it } from "vitest";

import { DEFAULT_FORMAT_LOCALE, formatCompactNumber, formatNumber } from "./format";

describe("formatNumber", () => {
  it("groups thousands the same way regardless of the host locale", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(DEFAULT_FORMAT_LOCALE).toBe("en-US");
  });

  it("honours an explicit locale", () => {
    expect(formatNumber(1234, { locale: "de-DE" })).toBe("1.234");
    expect(formatNumber(1234, { locale: "vi-VN" })).toBe("1.234");
  });

  it("passes Intl options through", () => {
    expect(formatNumber(0.5, { style: "percent" })).toBe("50%");
    expect(formatNumber(1234.5, { maximumFractionDigits: 0 })).toBe("1,235");
  });

  it("returns the same string for the same input twice (the formatter cache is not stateful)", () => {
    expect(formatNumber(1234)).toBe(formatNumber(1234));
    expect(formatNumber(1234, { locale: "de-DE" })).toBe("1.234");
    expect(formatNumber(1234)).toBe("1,234");
  });

  it("survives a malformed locale instead of taking the page down", () => {
    // `en_US` is the single most common shape a backend emits, and Intl throws on it. The locale
    // reaches here from a route segment or an Accept-Language header, and this runs during render.
    expect(formatNumber(1234, { locale: "en_US" })).toBe("1,234");
    expect(formatNumber(1234, { locale: "" })).toBe("1,234");
    expect(formatNumber(1234, { locale: "not a locale at all" })).toBe("1,234");
  });

  it("survives an impossible option combination too", () => {
    expect(
      formatNumber(1234.5, { minimumFractionDigits: 3, maximumFractionDigits: 1 }),
    ).toBe("1,234.5");
    expect(formatNumber(1234, { style: "currency" })).toBe("1,234");
  });

  it("falls back all the way when BOTH the locale and the options are impossible", () => {
    // The last resort: neither the caller's locale nor their options can be honoured, and the
    // number still has to appear on the page.
    expect(
      formatNumber(1234, {
        locale: "en_US",
        minimumFractionDigits: 3,
        maximumFractionDigits: 1,
      }),
    ).toBe("1,234");
  });

  it("keeps the cache bounded so an SSR process cannot leak formatters", () => {
    // The keys are caller-controlled: one locale per visitor, one option shape per column. Enough
    // DISTINCT combinations to pass the cap, or the eviction path never runs and the bound is a
    // comment rather than a behaviour.
    const locales = ["en-US", "de-DE", "fr-FR", "ja-JP"];
    for (let i = 0; i < 120; i += 1) {
      // The locale advances every 20 iterations, not every one: `i % 4` alongside `i % 20`
      // repeats after 20 combinations, so the cap was never actually reached.
      formatNumber(1, {
        locale: locales[Math.floor(i / 20) % locales.length],
        minimumIntegerDigits: (i % 20) + 1,
      });
    }

    // Still correct after eviction, and still using the pinned default.
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1234, { locale: "de-DE" })).toBe("1.234");
  });

  it("treats the same options in a different order as one cache entry", () => {
    expect(formatNumber(0.5, { style: "percent", maximumFractionDigits: 0 })).toBe("50%");
    expect(formatNumber(0.5, { maximumFractionDigits: 0, style: "percent" })).toBe("50%");
  });

  it("passes non-numbers through instead of throwing", () => {
    // A chart cell or a table cell renders whatever the data layer produced. A formatting helper
    // is the wrong place to take a page down over one unexpected value.
    expect(formatNumber("n/a")).toBe("n/a");
    expect(formatNumber(undefined)).toBe("undefined");
    expect(formatNumber(Number.NaN)).toBe("NaN");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("Infinity");
  });
});

describe("formatCompactNumber", () => {
  it("shortens large numbers", () => {
    expect(formatCompactNumber(1234)).toBe("1.2K");
    expect(formatCompactNumber(1_500_000)).toBe("1.5M");
  });

  it("still takes an explicit locale", () => {
    expect(formatCompactNumber(1234, { locale: "de-DE" })).toBe("1234");
  });
});
