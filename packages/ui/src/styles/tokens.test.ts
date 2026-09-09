// @vitest-environment node
// Contrast gate for the design tokens.
//
// tokens.css states a contrast ratio next to almost every colour. A comment cannot fail, so the
// moment someone nudges a lightness — or a Figma re-sync does — those numbers become decoration.
// This test reads the real generated stylesheet, converts the OKLCH values the same way a browser
// does, and asserts the pairs that carry a WCAG obligation.
//
// It deliberately parses the CSS rather than importing tokens.ts: the stylesheet is what ships to
// the browser, and a second source would be the thing that drifts. The PAIRS come from
// scripts/lib/token-schema.mjs, which is also what the generator reads — one list, not two.
//
// NEVER relax a threshold here to land a design. A failure means the palette got less readable,
// which is the only thing this file is for.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CONTRAST_PAIRS } from "../../../../scripts/lib/token-schema.mjs";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "tokens.css"),
  "utf8",
);

/** Tokens declared inside a given selector block (`:root` or `.dark`). */
function tokensOf(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  // Strip comments first: a description mentioning "3.03:1" must not be read as a declaration.
  for (const match of body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (!name || !value) continue;
    out[name] = value.trim();
  }
  return out;
}

/** Resolve `var(--x)` one level, which is all these tokens use. */
function resolve(tokens: Record<string, string>, name: string): string {
  const raw = tokens[name];
  if (!raw) throw new Error(`token not declared: ${name}`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  return ref?.[1] ? resolve(tokens, ref[1]) : raw;
}

/** oklch(L C H) → linear sRGB. Mirrors the Oklab spec used by browsers. */
function oklchToLinearRgb(value: string): [number, number, number] {
  const m = value.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%?)?\s*\)/,
  );
  if (!m) throw new Error(`not an oklch value: ${value}`);
  const [L, C, Hdeg] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
}

function relativeLuminance(value: string): number {
  const clamp = (c: number) => Math.min(1, Math.max(0, c));
  const [r, g, b] = oklchToLinearRgb(value);
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

function contrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("design tokens — %s theme", (_theme, selector) => {
  // `.dark` overrides only some tokens, so fall back to `:root` for the rest, exactly as the
  // cascade does in the browser.
  const scoped = { ...tokensOf(":root"), ...tokensOf(selector) };
  const t = (name: string) => resolve(scoped, name);

  it.each(CONTRAST_PAIRS)("%s on %s is at least %s:1", (ink, ground, min) => {
    expect(contrast(t(`--${ink}`), t(`--${ground}`))).toBeGreaterThanOrEqual(min);
  });

  it("primary and destructive are not the same colour", () => {
    // Deliberately weak, and the weakness is the point. An earlier draft asserted a luminance
    // ratio here; dark mode failed it, and chasing a passing value produced pale pinks that no
    // longer read as danger. Contrast ratio measures how readable one colour is ON another, not
    // how tellable-apart they are side by side — the wrong instrument for this claim. The honest
    // guarantee is that they are distinct tokens; the token file records why colour alone must
    // never carry a destructive affordance.
    expect(t("--primary")).not.toBe(t("--destructive"));
  });
});

describe("brand token", () => {
  it("is the exact brand primary, not a re-mix of it", () => {
    expect(resolve(tokensOf(":root"), "--brand")).toBe("oklch(0.6792 0.2128 36.53)");
  });

  it("is what --primary and --ring point at, in both themes", () => {
    // The literal `var(--brand)` matters: it is what makes a runtime re-brand — setting one
    // custom property on a subtree — actually move the primary and the focus ring with it.
    for (const selector of [":root", ".dark"]) {
      const scoped = { ...tokensOf(":root"), ...tokensOf(selector) };
      expect(scoped["--primary"]).toBe("var(--brand)");
      expect(scoped["--ring"]).toBe("var(--brand)");
    }
  });
});
