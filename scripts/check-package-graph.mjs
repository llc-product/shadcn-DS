/**
 * check-package-graph.mjs — two things the type-checker cannot see, and neither can review.
 *
 * 1. CYCLES between workspace packages. A cycle does not fail lint and does not fail tsc. It fails
 *    the build, in a different order on a different machine, with a message about a module that
 *    exists. Cheap to detect, miserable to debug.
 *
 * 2. SERVER CODE REACHABLE FROM A ROOT ENTRY. `@digitaltwin/auth` promises that importing the
 *    package name gives you something an edge runtime or a client component can hold, and that
 *    `next/headers` and `server-only` are reachable only through `./next`. That promise is an
 *    `exports` map plus a barrel that deliberately re-exports less than it could — both of which a
 *    one-line edit can undo, silently, with every test still green. This walks what the root entry
 *    actually reaches and fails if it reaches server code.
 *
 * The import walk is a regex over static specifiers, and the limit is stated rather than hidden:
 * it does not follow dynamic `import()`, and it does not resolve into other packages' sources. Both
 * would be ways to smuggle a violation past this check. Neither is used in this workspace, and a
 * `no-restricted-syntax` rule would be the place to keep it that way.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCOPE = "@digitaltwin/";

/** Modules that make a file server-only, whatever else it says about itself. */
const SERVER_ONLY_IMPORTS = [/^server-only$/, /^next\/headers$/, /^next\/navigation$/];

const read = (file) => readFileSync(file, "utf8");
const readJson = (file) => JSON.parse(read(file));

function workspaces() {
  const { workspaces: patterns = [] } = readJson(join(ROOT, "package.json"));
  const out = [];
  for (const pattern of patterns) {
    if (!pattern.endsWith("/*")) {
      throw new Error(`unsupported workspace pattern "${pattern}"`);
    }
    const dir = join(ROOT, pattern.slice(0, -2));
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(dir, entry.name, "package.json");
      if (existsSync(manifest))
        out.push({ dir: join(dir, entry.name), pkg: readJson(manifest) });
    }
  }
  return out;
}

const problems = [];
const packages = workspaces();

// ── 1. cycles ───────────────────────────────────────────────────────────────────────────────────
const graph = new Map();
for (const { pkg } of packages) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  graph.set(
    pkg.name,
    Object.keys(deps).filter((d) => d.startsWith(SCOPE)),
  );
}

const VISITING = 1;
const DONE = 2;
const state = new Map();

function walk(name, trail) {
  if (state.get(name) === DONE) return;
  if (state.get(name) === VISITING) {
    problems.push(`dependency cycle: ${[...trail, name].join(" → ")}`);
    return;
  }
  state.set(name, VISITING);
  for (const dep of graph.get(name) ?? []) walk(dep, [...trail, name]);
  state.set(name, DONE);
}
for (const name of graph.keys()) walk(name, []);

// ── 2. server code reachable from a root entry ──────────────────────────────────────────────────
/**
 * Two patterns, applied separately, because one alternation could not do this job.
 *
 * The single combined pattern this replaces had a lazy `[\s\S]*?` that spanned newlines, so a bare
 * `import "server-only";` was swallowed by the NEXT statement's `from "..."` and never captured.
 * Verified against this repo's own auth adapter: the guard printed "no server code at a root
 * entry" while `server-only` sat a few lines above. Side-effect imports of relative modules
 * (`import "./polyfill";`) were dropped the same way, so an entire subtree could go unwalked.
 */
const FROM_SPECIFIER = /\bfrom\s*["']([^"']+)["']/g;
const SIDE_EFFECT_SPECIFIER = /^[ \t]*import\s*["']([^"']+)["']/gm;

function specifiers(source) {
  const out = [];
  for (const match of source.matchAll(FROM_SPECIFIER)) out.push(match[1]);
  for (const match of source.matchAll(SIDE_EFFECT_SPECIFIER)) out.push(match[1]);
  return out.filter(Boolean);
}

/**
 * Resolve a relative specifier to a file on disk.
 *
 * `statSync().isFile()` rather than "try to read it as a directory and see whether that throws":
 * the previous version returned its answer from a `catch`, so an EACCES or EMFILE — not a
 * directory at all — was read as "this is a file", and the walk then crashed with EISDIR.
 *
 * The `.js` candidates exist because the packages write explicit `.js` extensions so Node ESM can
 * load them; on disk those are still `.ts`.
 */
function resolveLocal(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const withoutJs = base.replace(/\.js$/, "");
  for (const candidate of [
    `${withoutJs}.ts`,
    `${withoutJs}.tsx`,
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(withoutJs, "index.ts"),
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not there, or not readable. Either way it is not the module we are looking for.
    }
  }
  return null;
}

/** Every source file the entry reaches, following relative imports only. */
function reachable(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    for (const specifier of specifiers(read(file))) {
      if (!specifier.startsWith(".")) continue;
      const next = resolveLocal(file, specifier);
      if (next) stack.push(next);
    }
  }
  return seen;
}

for (const { dir, pkg } of packages) {
  // Only packages that publish a root entry make this promise, and only source we can read.
  const entry = join(dir, "src", "index.ts");
  if (pkg.private === true || !existsSync(entry)) continue;

  for (const file of reachable(entry)) {
    for (const specifier of specifiers(read(file))) {
      if (SERVER_ONLY_IMPORTS.some((pattern) => pattern.test(specifier))) {
        const where = file.slice(ROOT.length + 1).replaceAll("\\", "/");
        problems.push(
          `${pkg.name}: root entry reaches "${specifier}" via ${where}. ` +
            `Move it behind a subpath export, or stop re-exporting it from src/index.ts.`,
        );
      }
    }
  }
}

if (problems.length) {
  console.error("package graph check failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `check-package-graph: ${packages.length} workspaces, no cycles, no server code at a root entry`,
);
