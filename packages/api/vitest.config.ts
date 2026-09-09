import { defineConfig } from "vitest/config";

export default defineConfig({
  // No jsdom and no setup file: everything here is a pure function over values. Reaching for the
  // shared React config would pull a DOM this package has no use for.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
