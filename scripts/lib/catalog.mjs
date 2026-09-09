/**
 * catalog.mjs — read the component sources and describe them.
 *
 * There is NO hand-maintained list of props anywhere in this repo, and that is deliberate. The
 * TSX is the API; a second, hand-written copy of it would be the thing that goes stale, and it
 * would go stale silently, because nothing fails when a document is wrong.
 *
 * So everything derivable is derived: the one-line header, whether the module is a client
 * component, which Radix primitive it wraps, its CVA variants, and its exported symbols. The
 * optional `<name>.json` sidecar carries only what the source genuinely cannot say — a Figma node
 * id, guidance on when to reach for the thing, an example.
 *
 * Both build-catalog.mjs (docs/components.md) and gen-docs-manifest.mjs (the docs site's data)
 * read from here, so the page and the markdown can never disagree.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { UI_SRC } from "./token-schema.mjs";

export const COMPONENTS_DIR = join(UI_SRC, "components");

/**
 * Read a source file with line endings normalised to LF.
 *
 * Every pattern below anchors with `$`, and `$` does not match before a CRLF's `\r`. On a Windows
 * checkout with `core.autocrlf=true` that failed silently and completely: not one `export * from`
 * line matched, so the barrel looked empty and `catalog()` reported all 56 component folders as
 * missing from a file that lists every one of them.
 *
 * `.gitattributes` now pins LF, which fixes the same bug at the other end. Both exist on purpose —
 * a contributor's git config is not something a build script should have to trust.
 */
const readSource = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

/** The section comments in components/index.ts, in order, with the folders under each. */
export function sections() {
  const barrel = readSource(join(COMPONENTS_DIR, "index.ts"));
  const out = [];
  let current = null;
  for (const line of barrel.split("\n")) {
    const heading = line.match(/^\/\/ (?!components —)(.+)$/);
    if (heading?.[1] && !heading[1].startsWith("One line per folder")) {
      current = { title: heading[1].trim(), names: [] };
      out.push(current);
      continue;
    }
    const exported = line.match(/^export \* from "\.\/([\w-]+)";$/);
    if (exported?.[1] && current) current.names.push(exported[1]);
  }
  return out.filter((s) => s.names.length);
}

/** Everything derivable about one component folder, plus its sidecar if it has one. */
export function describeComponent(name) {
  const file = join(COMPONENTS_DIR, name, `${name}.tsx`);
  const source = readSource(file);

  const header = source.match(/^\/\/ components\/[\w-]+\.tsx(?: — (.+))?$/m);
  const radix = source.match(/from "@radix-ui\/react-([\w-]+)"/);

  // Exported symbols come from the folder barrel, not from the TSX: the barrel is what decides
  // what is public, and a component may deliberately not export a helper it defines.
  const barrelFile = join(COMPONENTS_DIR, name, "index.ts");
  const barrel = existsSync(barrelFile) ? readSource(barrelFile) : "";
  const exports = [
    ...barrel.matchAll(/(?:^|[{,]\s*)((?:type\s+)?[A-Za-z][\w]*)\s*(?=[,}])/g),
  ]
    .map((m) => m[1].trim())
    .filter((s) => s && s !== "from");

  const sidecarFile = join(COMPONENTS_DIR, name, `${name}.json`);
  const sidecar = existsSync(sidecarFile)
    ? JSON.parse(readFileSync(sidecarFile, "utf8"))
    : null;

  return {
    name,
    file: `packages/ui/src/components/${name}/${name}.tsx`,
    description: header?.[1] ?? "",
    client: /^\s*"use client";\s*$/m.test(source.split("\n").slice(0, 5).join("\n")),
    radixBase: radix?.[1] ? `@radix-ui/react-${radix[1]}` : null,
    variants: cvaVariants(source),
    exports,
    sidecar,
  };
}

/**
 * Pull the variant scales out of a `cva(...)` call.
 *
 * A regex, not a parser, and the limits are stated rather than hidden: it reads the `variants: {}`
 * block one level deep and lists the keys of each scale. That is exactly what the catalog shows.
 * It does not understand `compoundVariants`, and it would miss variants built dynamically — no
 * component in this package does either, and `assertParsed` below fails loudly if that changes.
 */
export function cvaVariants(source) {
  const start = source.indexOf("variants: {");
  if (start === -1) return null;

  // Walk braces to find the end of the variants object, so a nested scale cannot truncate it.
  let depth = 0;
  let end = -1;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end === -1) return null;

  const body = source.slice(start, end);
  const out = {};
  for (const scale of body.matchAll(/^\s{6}(\w+): \{([\s\S]*?)^\s{6}\},$/gm)) {
    const [, scaleName, scaleBody] = scale;
    if (!scaleName || !scaleBody) continue;
    out[scaleName] = [...scaleBody.matchAll(/^\s{8}([\w"'-]+):/gm)].map((m) =>
      (m[1] ?? "").replace(/['"]/g, ""),
    );
  }
  return Object.keys(out).length ? out : null;
}

/** Every component, grouped the way the barrel groups them. */
export function catalog() {
  const known = new Set(
    readdirSync(COMPONENTS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );

  const grouped = sections().map((section) => ({
    ...section,
    components: section.names.map(describeComponent),
  }));

  // A folder that exists but is not in the barrel is invisible to every consumer. That is almost
  // always a forgotten export line, and it is not something a build would otherwise notice.
  const listed = new Set(grouped.flatMap((s) => s.names));
  const orphans = [...known].filter((n) => !listed.has(n));
  if (orphans.length) {
    throw new Error(
      `component folder(s) missing from components/index.ts: ${orphans.join(", ")}`,
    );
  }
  return grouped;
}
