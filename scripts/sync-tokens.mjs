/**
 * sync-tokens.mjs — tokens.raw.json (unfiltered Figma dump) -> tokens.export.json (validated).
 *
 * AWAITING FIGMA. There is no variable collection for the React DS yet, so tokens.raw.json is a
 * placeholder and tokens.export.json is hand-seeded. This script is written against the real
 * schema and runs the moment the collection exists — the generator downstream does not change.
 *
 * The split between raw and export is the point: raw is whatever Figma gave us, export is what
 * this repo has agreed to consume. Validating at that seam is what turns a Figma rename into a
 * named error instead of a stylesheet that is quietly missing half its tokens.
 */
import { writeFileSync } from "node:fs";

import {
  CONSUMED_COLLECTIONS,
  EXPORT_FILE,
  KNOWN_EXTRA_COLLECTIONS,
  PREFIX_MIN,
  RAW_FILE,
  SEMANTIC_MODES,
  SEMANTIC_ORDER,
  flatten,
  loadExport,
} from "./lib/token-schema.mjs";

const raw = loadExport(RAW_FILE);

if (!Object.keys(raw.tokens).length) {
  console.error(
    `${RAW_FILE} is still the placeholder.\n` +
      `Export the React DS variable collection from Figma into it first, then re-run.\n` +
      `Until then tokens.export.json stays hand-seeded and \`npm run build:tokens\` is the ` +
      `only step you need.`,
  );
  process.exit(1);
}

const errors = [];
const flat = {};

for (const col of CONSUMED_COLLECTIONS) {
  if (!raw.tokens[col]) {
    errors.push(`missing collection "${col}"`);
    continue;
  }
  flat[col] = flatten(raw.tokens[col]);
}

for (const { col, prefix, min } of PREFIX_MIN) {
  if (!flat[col]) continue;
  const n = [...flat[col].keys()].filter((k) => k.startsWith(prefix)).length;
  if (n < min)
    errors.push(`"${col}" has ${n} tokens under "${prefix}", expected >= ${min}`);
}

for (const name of SEMANTIC_ORDER) {
  const leaf = flat.semantic?.get(`color/${name}`);
  if (!leaf) {
    errors.push(`semantic colour "color/${name}" is missing`);
    continue;
  }
  for (const mode of SEMANTIC_MODES) {
    if (!(mode in leaf.value)) {
      errors.push(`semantic "color/${name}" has no "${mode}" mode`);
    }
  }
}

if (errors.length) {
  console.error(`tokens.raw.json failed validation:\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}

// Keep the consumed collections plus the ones we knowingly carry but do not read; drop the rest,
// so an unrelated Figma collection cannot land in this repo's diff.
const keep = [...CONSUMED_COLLECTIONS, ...KNOWN_EXTRA_COLLECTIONS];
const tokens = Object.fromEntries(
  Object.entries(raw.tokens).filter(([col]) => keep.includes(col)),
);

const previous = loadExport(EXPORT_FILE);
writeFileSync(
  EXPORT_FILE,
  JSON.stringify(
    {
      $meta: {
        ...previous.$meta,
        source: "figma",
        syncedAt: new Date().toISOString(),
      },
      tokens,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `sync-tokens: wrote ${Object.keys(tokens).length} collections. ` +
    `Run \`npm run build:tokens\` next — or use \`npm run sync:tokens\`, which does both.`,
);
