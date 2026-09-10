// @vitest-environment node
// T-DIST-DIRECTIVES — every client module must still say so after the build.
//
// WHY THIS EXISTS, and it is a measured number rather than a principle. A `"use client"` directive
// only means anything on the FIRST LINE of a module. Any build step that concatenates modules
// either drops it — and the Radix components break at runtime, in the consumer's app, not here —
// or hoists it, which turns the entire library into one client reference. The consuming
// boilerplate has already paid for that second failure once: exporting a single client component
// from a shared barrel added 5,433 B to a route that rendered none of it.
//
// tsup.config.ts sets `bundle: false` to prevent both. That flag is one word, in a file nobody
// reads twice, and nothing else would notice if it were flipped: the build stays green, the types
// stay correct, and the damage only appears as a bundle-size regression in a different repo.
// This test is what notices.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = dirname(fileURLToPath(import.meta.url));
const PKG = join(SRC, "..");
const DIST = join(PKG, "dist");

const isDirective = (line: string) =>
  line === '"use client";' || line === "'use client';";

/**
 * Does this module declare itself a client module?
 *
 * A directive prologue is the first STATEMENT, and comments are not statements — every component
 * in this package opens with a `// components/<name>.tsx — …` header and puts `"use client"` on
 * the line below it, which is valid and is the convention documented in component-authoring.md.
 * So the source side must skip comments and blank lines. The build side does not: esbuild always
 * emits the directive on line 1, and a build that did not is precisely the failure being caught.
 */
function declaresClient(file: string, skipComments: boolean): boolean {
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!skipComments) return isDirective(line);
    if (
      line === "" ||
      line.startsWith("//") ||
      line.startsWith("/*") ||
      line.startsWith("*")
    )
      continue;
    return isDirective(line);
  }
  return false;
}

/** Every source module, so the check covers files added after this test was written. */
async function sourceModules(): Promise<string[]> {
  const { glob } = await import("node:fs/promises");
  const out: string[] = [];
  for await (const f of glob("**/*.{ts,tsx}", { cwd: SRC })) {
    if (!f.endsWith(".test.ts") && !f.endsWith(".test.tsx")) out.push(f);
  }
  return out.sort();
}

describe("build output", () => {
  it("exists — run `npm run build` before this suite", () => {
    expect(
      existsSync(DIST),
      "dist/ is missing. `npm run check` builds before it tests, for this reason.",
    ).toBe(true);
  });

  it('carries "use client" on exactly the modules whose source does', async () => {
    const mismatches: string[] = [];
    let clientCount = 0;

    for (const rel of await sourceModules()) {
      const src = join(SRC, rel);
      const out = join(DIST, rel.replace(/\.tsx?$/, ".js"));
      if (!existsSync(out)) {
        mismatches.push(`${rel}: no build output at ${relative(PKG, out)}`);
        continue;
      }
      const wanted = declaresClient(src, true);
      const got = declaresClient(out, false);
      if (wanted) clientCount++;
      if (wanted !== got) {
        mismatches.push(
          wanted
            ? `${rel}: source is a client module, build output is NOT — the directive was dropped`
            : `${rel}: source is server-safe, build output claims "use client" — it was hoisted`,
        );
      }
    }

    expect(mismatches).toEqual([]);
    // A floor, not an exact count: adding a client component should not need this file edited.
    // Zero here would mean the glob silently matched nothing, which is the failure mode that
    // makes a test like this pass forever while checking nothing.
    expect(clientCount).toBeGreaterThanOrEqual(20);
  });
});
