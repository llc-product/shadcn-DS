/**
 * check-figma-drift.mjs — is the committed snapshot still what Figma holds?
 *
 * Read-only. Reports added / removed / changed tokens between tokens.raw.json (a fresh dump) and
 * tokens.export.json (what this repo consumes), and exits non-zero when they disagree.
 *
 * This is the counterpart to the contrast gate. The gate catches a palette that got less
 * readable; this catches a palette that moved in Figma and never reached the code — a silent
 * divergence that no build failure would ever surface.
 */
import {
  CONSUMED_COLLECTIONS,
  EXPORT_FILE,
  RAW_FILE,
  flatten,
  loadExport,
} from "./lib/token-schema.mjs";

const raw = loadExport(RAW_FILE);
if (!Object.keys(raw.tokens).length) {
  console.log(
    "check-figma-drift: tokens.raw.json is still the placeholder — nothing to compare.",
  );
  process.exit(0);
}

const current = loadExport(EXPORT_FILE);
const findings = [];

for (const col of CONSUMED_COLLECTIONS) {
  const a = raw.tokens[col] ? flatten(raw.tokens[col]) : new Map();
  const b = current.tokens[col] ? flatten(current.tokens[col]) : new Map();

  for (const key of a.keys())
    if (!b.has(key)) findings.push(`+ ${col}:${key} (new in Figma)`);
  for (const key of b.keys())
    if (!a.has(key)) findings.push(`- ${col}:${key} (gone from Figma)`);
  for (const [key, leaf] of a) {
    const other = b.get(key);
    if (!other) continue;
    if (JSON.stringify(leaf.value) !== JSON.stringify(other.value)) {
      findings.push(`~ ${col}:${key} (value changed)`);
    }
  }
}

if (!findings.length) {
  console.log("check-figma-drift: snapshot matches Figma.");
  process.exit(0);
}
console.error(
  `check-figma-drift: ${findings.length} difference(s)\n  ${findings.join("\n  ")}`,
);
console.error(
  "\nRun `npm run sync:tokens` to adopt them (and re-read the contrast gate output).",
);
process.exit(1);
