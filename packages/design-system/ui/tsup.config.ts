import { defineConfig } from "tsup";

export default defineConfig({
  // UNBUNDLED, and this is the load-bearing decision in the whole build.
  //
  // Bundling would concatenate modules, and a `"use client"` directive only means anything on the
  // first line of a module. Merge a client component into the same chunk as a server-safe one and
  // either the directive is dropped (the Radix components break) or it is hoisted (the ENTIRE
  // library becomes a client reference, and every route importing anything from it pays for the
  // whole thing). The consuming boilerplate measured that second failure once already: exporting
  // one client component from a shared barrel cost +5,433 B on a route that rendered none of it.
  //
  // dist-directives.test.ts asserts the directives actually survived. Do not take this comment's
  // word for it — the test is the guarantee.
  entry: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.*", "!src/**/*.d.ts"],
  bundle: false,
  format: ["esm"],
  target: "es2022",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  // Types come from tsc, not from tsup's dts step: rollup-plugin-dts flattens declarations, which
  // would collapse the per-file layout the `./tokens` subpath export depends on.
  dts: false,
});
