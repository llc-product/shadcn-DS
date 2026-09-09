import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/index.ts",
        "src/**/*.d.ts",
        // Generated from tokens.export.json — the generator is what needs testing, and the
        // contrast gate tests its output directly.
        "src/tokens/tokens.ts",
      ],
      // A RATCHET set just under what the suite actually covers today (98.15 / 89.28 / 97 /
      // 98.15), not an aspiration. Its job is to fail the build when coverage DROPS. Raise these
      // as tests are added; the one thing never to do is lower them to make CI green.
      thresholds: { lines: 97, functions: 95, branches: 88, statements: 97 },
    },
  },
});
