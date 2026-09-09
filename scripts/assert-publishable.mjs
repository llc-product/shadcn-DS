/**
 * assert-publishable.mjs — refuse to publish anything this repo does not own.
 *
 * The old guard read one hardcoded manifest and asserted its name was scoped. That was correct for
 * a workspace with one publishable package and became a decoration the moment there were several:
 * it kept passing while saying nothing at all about the packages it did not name.
 *
 * This walks every workspace instead, so a new package is covered the day it is added rather than
 * the day someone remembers to add it here. Three things are checked, and each is a way a package
 * can reach a registry it was never meant to:
 *
 *   1. Scope. A name outside @digitaltwin/ could resolve to a PUBLIC package of the same name.
 *   2. `publishConfig.access`. "restricted" is what keeps a private-registry package private if
 *      the registry ever falls back to a public one.
 *   3. A version. `changeset publish` compares versions against the registry; a missing one is a
 *      manifest that was never meant to ship and is about to.
 *   4. A REAL RANGE on every internal runtime dependency. npm resolves "*" against the workspace
 *      locally, so it looks fine forever — and then publishes verbatim, telling consumers that any
 *      version of @digitaltwin/utils will do. That is not a loose pin, it is no pin at all, and
 *      changesets cannot bump a range that expresses nothing. devDependencies are exempt: they are
 *      not installed by consumers.
 *
 * Anything marked `"private": true` is skipped — that is npm's own opt-out, and it is how
 * apps/docs stays a consumer rather than a package.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCOPE = "@digitaltwin/";

const read = (file) => JSON.parse(readFileSync(file, "utf8"));

/** Every workspace folder named by the root manifest's `workspaces` globs. */
function workspaceManifests() {
  const { workspaces = [] } = read(join(ROOT, "package.json"));
  const out = [];

  for (const pattern of workspaces) {
    // The globs in use are exactly `<dir>/*`. Anything fancier should fail loudly rather than
    // silently matching nothing, because "matched nothing" is indistinguishable from "all clear".
    if (!pattern.endsWith("/*")) {
      throw new Error(
        `assert-publishable: unsupported workspace pattern "${pattern}". ` +
          `Only "<dir>/*" is understood; teach this script the new shape rather than ` +
          `letting it skip a package.`,
      );
    }
    const dir = join(ROOT, pattern.slice(0, -2));
    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(dir, entry.name, "package.json");
      if (existsSync(manifest)) out.push(manifest);
    }
  }
  return out;
}

const problems = [];
let checked = 0;

for (const file of workspaceManifests()) {
  const pkg = read(file);
  const where = file.slice(ROOT.length + 1).replaceAll("\\", "/");

  if (pkg.private === true) continue;
  checked += 1;

  if (typeof pkg.name !== "string" || !pkg.name.startsWith(SCOPE)) {
    problems.push(`${where}: name "${pkg.name}" is not under ${SCOPE}`);
  }
  if (pkg.publishConfig?.access !== "restricted") {
    problems.push(
      `${where}: publishConfig.access is "${pkg.publishConfig?.access}", expected "restricted"`,
    );
  }
  if (typeof pkg.version !== "string" || pkg.version.length === 0) {
    problems.push(
      `${where}: no version — mark it "private": true if it should not publish`,
    );
  }

  for (const field of ["dependencies", "peerDependencies"]) {
    for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
      if (!dep.startsWith(SCOPE)) continue;
      if (range === "*" || range === "" || range === "latest") {
        problems.push(
          `${where}: ${field}["${dep}"] is "${range}" — publishes as "any version". ` +
            `Use a real range such as "^0.1.0" so changesets can bump it.`,
        );
      }
    }
  }
}

if (problems.length) {
  console.error("refusing to publish:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

if (checked === 0) {
  console.error(
    "assert-publishable: no publishable package found — that cannot be right.",
  );
  process.exit(1);
}

console.log(`assert-publishable: ${checked} package(s) cleared to publish`);
