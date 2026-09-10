import { defineConfig } from "tsup";

export default defineConfig({
  // Unbundled: `setup.ts` is a side-effect module imported for its globals, so it has to survive
  // as its own file rather than being folded into the config entry.
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
