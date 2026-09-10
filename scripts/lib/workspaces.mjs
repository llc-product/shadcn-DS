/**
 * workspaces.mjs — expand the root manifest's `workspaces` globs, once.
 *
 * Its own module because two scripts need it and they had drifted: `check-package-graph.mjs`
 * learned `packages/*​/*` when the packages were grouped by layer, and `assert-publishable.mjs`
 * did not. It kept assuming one level, matched nothing, and reported "no publishable package
 * found — that cannot be right." It exits 1 there, so CI would have failed rather than published
 * nothing — but the guard for the publish stage was itself broken, and only running the publish
 * job would have said so.
 *
 * One function, so the next change to the tree cannot teach one script and miss the other.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/** Directories `depth` levels under `base` that contain a package.json. */
function expand(base, depth) {
  if (!existsSync(base)) return [];
  const dirs = readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (depth > 1) return dirs.flatMap((e) => expand(join(base, e.name), depth - 1));
  return dirs
    .map((e) => join(base, e.name))
    .filter((dir) => existsSync(join(dir, "package.json")));
}

/**
 * Every workspace directory, with its manifest.
 *
 * Throws on a pattern this does not understand rather than skipping it: "matched nothing" and
 * "all clear" are indistinguishable to every caller, which is how a broken glob passes for a
 * clean run.
 *
 * @param {string} root absolute path to the repository root
 * @returns {Array<{ dir: string, manifest: string, pkg: Record<string, unknown> }>}
 */
export function workspacePackages(root) {
  const { workspaces = [] } = readJson(join(root, "package.json"));
  const out = [];

  for (const pattern of workspaces) {
    const parts = pattern.split("/");
    const stars = parts.filter((p) => p === "*").length;
    // Only trailing stars: `packages/*` and `packages/*​/*` are understood, `packages/*​/src` is not.
    if (stars === 0 || parts.slice(-stars).some((p) => p !== "*")) {
      throw new Error(
        `unsupported workspace pattern "${pattern}". Only trailing "*" segments are understood; ` +
          `teach scripts/lib/workspaces.mjs the new shape rather than letting it skip a package.`,
      );
    }

    const base = join(root, ...parts.slice(0, parts.length - stars));
    for (const dir of expand(base, stars)) {
      const manifest = join(dir, "package.json");
      out.push({ dir, manifest, pkg: readJson(manifest) });
    }
  }
  return out;
}
