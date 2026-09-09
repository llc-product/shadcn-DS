/**
 * color.mjs — colour conversion for the token pipeline.
 *
 * The generator must accept a value from either source and emit ONE format:
 *   · a hand-authored / already-OKLCH string  → passes through untouched
 *   · a Figma COLOR value {r,g,b,a} (sRGB 0..1) → converted to OKLCH
 *
 * Emitting one format matters because the contrast gate parses the generated stylesheet. Two
 * colour syntaxes would mean two parsers, and the second one is where the bug lives.
 */

/** sRGB channel (0..1, gamma-encoded) -> linear. */
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/**
 * Linear sRGB -> Oklab -> OKLCH. Inverse of the transform the contrast gate applies, using the
 * same matrices from the Oklab spec, so a round-trip through this pair is stable.
 */
export function srgbToOklch({ r, g, b, a = 1 }) {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.hypot(A, B);
  // Hue is meaningless at zero chroma; pin it to 0 so a grey never emits a noise hue that then
  // shows up as a spurious diff on the next re-sync.
  const H = C < 1e-6 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;

  const round = (n, p) => Number(n.toFixed(p));
  const base = `${round(L, 4)} ${round(C, 4)} ${round(H, 2)}`;
  return a >= 1 ? `oklch(${base})` : `oklch(${base} / ${round(a * 100, 2)}%)`;
}

/** Normalise whatever a COLOR leaf holds into a CSS colour string. */
export function toCssColor(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.r === "number") {
    return srgbToOklch(value);
  }
  throw new Error(`not a colour value: ${JSON.stringify(value)}`);
}
