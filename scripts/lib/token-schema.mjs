/**
 * token-schema.mjs — single source of truth for the token snapshot schema.
 *
 * build-tokens.mjs (generator), sync-tokens.mjs (validator), check-figma-drift.mjs and
 * gen-docs-manifest.mjs all import everything schema-shaped from here, so "what the pipeline
 * consumes" and "what the validator asserts" cannot drift apart. (The Quasar/Vue counterpart
 * learned this the hard way: its two scripts used to hand-mirror the same literals
 * independently.)
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { toCssColor } from "./color.mjs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const EXPORT_FILE = join(ROOT, "tokens.export.json");
export const RAW_FILE = join(ROOT, "tokens.raw.json");

export const UI_SRC = join(ROOT, "packages/ui/src");
export const TOKENS_CSS = join(UI_SRC, "styles/tokens.css");
export const TOKENS_TS = join(UI_SRC, "tokens/tokens.ts");

/** Collections build-tokens.mjs actually reads. Anything else in the file is ignored, not fatal. */
export const CONSUMED_COLLECTIONS = ["primitives", "semantic", "typo-base", "motion"];
export const KNOWN_EXTRA_COLLECTIONS = ["typography", "effect"];

/** The two theme modes of the `semantic` collection. Everything else is single-mode. */
export const SEMANTIC_MODES = ["Light", "Dark"];

/**
 * Fail-below thresholds. A Figma rename turns a `pick()` into an empty map, which then emits a
 * stylesheet that is quietly missing half its tokens. These make that surface in the validator
 * with the group name instead.
 */
export const PREFIX_MIN = [
  { col: "primitives", prefix: "colors/", min: 15 },
  { col: "primitives", prefix: "colors/brand/", min: 2 },
  { col: "primitives", prefix: "colors/neutral/", min: 9 },
  { col: "primitives", prefix: "border radius/", min: 1 },
  { col: "semantic", prefix: "color/", min: 25 },
  { col: "primitives", prefix: "colors/chart/", min: 10 },
  { col: "typo-base", prefix: "typography/font-family/", min: 2 },
  { col: "motion", prefix: "duration/", min: 3 },
  { col: "motion", prefix: "easing/", min: 3 },
];

/**
 * Theme-independent tokens lifted straight out of `primitives` into `:root`. These have no
 * Light/Dark split — re-branding is one value here, in both themes at once.
 */
export const ROOT_PRIMITIVES = [
  { css: "--radius", col: "primitives", path: "border radius/base", as: "rem" },
  { css: "--brand", col: "primitives", path: "colors/brand/base", as: "color" },
  { css: "--brand-strong", col: "primitives", path: "colors/brand/strong", as: "color" },
];

/**
 * Emission order for the semantic colours. Explicit rather than alphabetical: the stylesheet is
 * read by humans, and ground-then-ink pairs belong next to each other. Also makes the generated
 * diff stable when Figma reorders its variables.
 */
export const SEMANTIC_ORDER = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-strong",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  // Chart series. Decorative by construction — a series fill or stroke is not text and has no
  // partner token to be read against, so these carry no CONTRAST_PAIRS entry. Keeping them in
  // the semantic layer is still right: they are theme-dependent, and the app re-brands them here.
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
];

/**
 * Pairs the contrast gate enforces: [ink, ground, minimum ratio, theme].
 * 4.5 = WCAG AA body text · 3.0 = AA large text and non-text (focus rings, borders).
 * These are MEASURED minimums the current palette clears, not aspirations.
 *
 * @type {ReadonlyArray<readonly [ink: string, ground: string, min: number]>}
 */
export const CONTRAST_PAIRS = [
  ["foreground", "background", 4.5],
  ["card-foreground", "card", 4.5],
  ["popover-foreground", "popover", 4.5],
  ["primary-foreground", "primary", 4.5],
  // The brand AS TEXT — the link button variant. --primary itself does not clear this, which is
  // exactly why --primary-strong exists; see its description in tokens.export.json.
  ["primary-strong", "background", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["destructive-foreground", "destructive", 4.5],
  ["destructive", "background", 4.5],
  ["ring", "background", 3.0],
  // --primary as a non-text UI element: the RadioGroupItem indicator dot (text-primary +
  // fill-current). AA non-text is 3.0, which the brand clears at 3.164:1 on white.
  ["primary", "background", 3.0],
];

/** "collection:path" -> the :root custom property that already holds that value. */
export const ROOT_PRIMITIVE_BY_PATH = new Map(
  ROOT_PRIMITIVES.map(({ css, col, path }) => [`${col}:${path}`, css]),
);

// ── loading / resolving ─────────────────────────────────────────────────────────────────────────

export function loadExport(file = EXPORT_FILE) {
  const doc = JSON.parse(readFileSync(file, "utf8"));
  if (!doc || typeof doc.tokens !== "object" || doc.tokens === null) {
    throw new Error(`${file}: missing top-level "tokens" object`);
  }
  return doc;
}

/** Is this node a leaf (a variable) rather than a group? */
const isLeaf = (node) =>
  node && typeof node === "object" && typeof node.type === "string" && "value" in node;

/** Flatten one collection into Map<"a/b/c", leaf>. */
export function flatten(collection) {
  const out = new Map();
  const walk = (node, prefix) => {
    if (isLeaf(node)) {
      out.set(prefix, node);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      walk(child, prefix ? `${prefix}/${key}` : key);
    }
  };
  walk(collection, "");
  return out;
}

/** Every consumed collection, flattened. Missing collections are an error; extra ones are not. */
export function flattenAll(doc) {
  const flat = {};
  for (const col of CONSUMED_COLLECTIONS) {
    if (!doc.tokens[col])
      throw new Error(`tokens.export.json: missing collection "${col}"`);
    flat[col] = flatten(doc.tokens[col]);
  }
  return flat;
}

/**
 * Build the alias index. A hand-authored alias carries `path` ("collection:a/b/c"); a Figma
 * export carries `id` ("VariableID:…"), which is resolved through this id -> path index. Both
 * forms are supported so today's seed and tomorrow's Figma export use the same resolver.
 */
export function aliasIndex(flat) {
  const byId = new Map();
  for (const [col, map] of Object.entries(flat)) {
    for (const [path, leaf] of map) if (leaf.id) byId.set(leaf.id, `${col}:${path}`);
  }
  return byId;
}

/**
 * Resolve a leaf's value for `mode`, following aliases. Throws on a cycle or a dangling target.
 * Returns `terminal` — the "collection:path" the chain ended at — so the generator can tell a
 * semantic token that merely POINTS AT a root primitive from one that holds its own value.
 */
export function resolveValue(flat, col, path, mode, seen = new Set()) {
  const key = `${col}:${path}`;
  if (seen.has(key)) throw new Error(`token alias cycle at ${key}`);
  seen.add(key);

  const leaf = flat[col]?.get(path);
  if (!leaf) throw new Error(`token not found: ${key}`);

  const modes = Object.keys(leaf.value);
  // Single-mode collections name their mode differently per Figma file ("Mode 1", "Default", …).
  // Taking the only key is correct and survives that rename; asking for a literal name does not.
  const chosen = mode in leaf.value ? mode : modes.length === 1 ? modes[0] : undefined;
  if (chosen === undefined) {
    throw new Error(`${key}: no mode "${mode}" (has: ${modes.join(", ")})`);
  }

  const raw = leaf.value[chosen];
  if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
    const target = raw.path ?? aliasIndex(flat).get(raw.id);
    if (!target) throw new Error(`${key}: dangling alias ${raw.id ?? "(no id/path)"}`);
    const [tCol, ...rest] = target.split(":");
    return resolveValue(flat, tCol, rest.join(":"), mode, seen);
  }

  return { leaf, value: raw, terminal: key };
}

/** Resolve and format for CSS, per the leaf's declared type. */
export function resolveCss(flat, col, path, mode) {
  const { leaf, value } = resolveValue(flat, col, path, mode);
  switch (leaf.type) {
    case "COLOR":
      return toCssColor(value);
    case "FLOAT":
      return value;
    case "STRING":
      return value;
    default:
      throw new Error(`${col}:${path}: unsupported token type ${leaf.type}`);
  }
}

/** px -> rem against a 16px root. Kept here so the generator and the docs agree on the divisor. */
export const pxToRem = (px) => `${px / 16}rem`;

/** Description of a leaf, for the generated comment. */
export function describe(flat, col, path) {
  return flat[col]?.get(path)?.description ?? "";
}
