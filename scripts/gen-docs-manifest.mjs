/**
 * gen-docs-manifest.mjs — the sources and the token snapshot -> the docs site's data.
 *
 * The site renders from JSON rather than reading the repo at request time, because it ships as a
 * static export. Both files are generated from the SAME modules the markdown catalog and the
 * stylesheet come from, so the page, docs/components.md and tokens.css cannot disagree about what
 * this library contains.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { catalog } from "./lib/catalog.mjs";
import {
  ROOT,
  ROOT_PRIMITIVES,
  SEMANTIC_ORDER,
  describe,
  flattenAll,
  loadExport,
  pxToRem,
  resolveCss,
} from "./lib/token-schema.mjs";

const DATA = join(ROOT, "apps/docs/src/data");
mkdirSync(DATA, { recursive: true });

// ── components ──────────────────────────────────────────────────────────────────────────────────
const groups = catalog();
writeFileSync(join(DATA, "components.json"), JSON.stringify(groups, null, 2) + "\n");

// ── tokens ──────────────────────────────────────────────────────────────────────────────────────
const flat = flattenAll(loadExport());

const colors = SEMANTIC_ORDER.map((name) => ({
  name,
  // The description is where the measured contrast reasoning lives. Carrying it to the site is
  // the point: a swatch grid with no rationale invites someone to "fix" a colour that is the way
  // it is on purpose.
  description: describe(flat, "semantic", `color/${name}`),
  light: resolveCss(flat, "semantic", `color/${name}`, "Light"),
  dark: resolveCss(flat, "semantic", `color/${name}`, "Dark"),
}));

const primitives = ROOT_PRIMITIVES.map(({ css, col, path, as }) => {
  const raw = resolveCss(flat, col, path, "Mode 1");
  return {
    name: css,
    value: as === "rem" ? pxToRem(raw) : raw,
    kind: as === "rem" ? "size" : "color",
    description: describe(flat, col, path),
  };
});

const motion = {
  duration: ["fast", "default", "slow"].map((k) => ({
    name: k,
    value: `${resolveCss(flat, "motion", `duration/${k}`, "Default")}ms`,
  })),
  easing: ["standard", "accelerate", "decelerate"].map((k) => ({
    name: k,
    value: resolveCss(flat, "motion", `easing/${k}`, "Default"),
  })),
};

const fonts = ["sans", "mono"].map((k) => ({
  name: k,
  value: resolveCss(flat, "typo-base", `typography/font-family/${k}`, "Mode 1"),
}));

writeFileSync(
  join(DATA, "tokens.json"),
  JSON.stringify({ primitives, colors, fonts, motion }, null, 2) + "\n",
);

console.log(
  `gen-docs-manifest: ${groups.flatMap((g) => g.components).length} components, ` +
    `${colors.length} semantic colours -> ${dirname(join(DATA, "x"))}`,
);
