import { defineConfig } from "tsup";

export default defineConfig({
  // Unbundled, matching packages/ui. Nothing here carries a "use client" directive today, but the
  // rule that makes that safe is the build shape rather than the current contents — and per-file
  // output is also what keeps a consumer's bundler able to drop what it does not import.
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  bundle: false,
  format: ["esm"],
  target: "es2022",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  // Declarations come from tsc, not tsup's dts step, which flattens them.
  dts: false,
});
