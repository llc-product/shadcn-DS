// @digitaltwin/testing — one Vitest config shape for every React codebase in this org.
//
// A factory rather than a config object, because two things genuinely differ per repository and
// nothing else does: where the sources are, and what the coverage ratchet is set to.
//
// About the ratchet. It is set just under what a suite ACTUALLY covers, not to an aspiration. Its
// job is to fail the build when coverage DROPS. Raise it as tests are added; the one thing never
// to do is lower it to make CI green — that converts the only automatic signal about test decay
// into a number someone edits whenever it complains.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export type CoverageThresholds = {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
};

export type TestingConfigOptions = {
  /** Where the setup file sits, relative to the consumer's vitest.config.ts. */
  setupFile?: string;
  include?: string[];
  /** Added to the defaults rather than replacing them. */
  coverageExclude?: string[];
  thresholds: CoverageThresholds;
};

/**
 * Excluded everywhere, because covering them measures nothing:
 * barrels re-export and have no branches; declaration files have no runtime.
 */
const ALWAYS_EXCLUDED = ["**/*.test.{ts,tsx}", "**/index.ts", "**/*.d.ts"];

export function defineTestingConfig(options: TestingConfigOptions) {
  return defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: [options.setupFile ?? "./vitest.setup.ts"],
      include: options.include ?? ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [...ALWAYS_EXCLUDED, ...(options.coverageExclude ?? [])],
        thresholds: options.thresholds,
      },
    },
  });
}

export default defineTestingConfig;
