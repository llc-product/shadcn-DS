// eslint.config.mjs — flat config for the design-system monorepo.
//
// The rules themselves live in @digitaltwin/eslint-config, so a consuming repository lints against
// the same ones rather than a copy of them. What stays here is the part that is genuinely local:
// what this repo generates, and which folders hold what.
import { base, testOverrides } from "@digitaltwin/eslint-config/base";
import { designSystem } from "@digitaltwin/eslint-config/design-system";
import { node } from "@digitaltwin/eslint-config/node";
import { react } from "@digitaltwin/eslint-config/react";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.next/**",
      "**/out/**",
      // Generated. build-tokens.mjs owns these; lint findings belong in the generator.
      "packages/ui/src/styles/tokens.css",
      "packages/ui/src/tokens/tokens.ts",
    ],
  },

  ...base,
  ...node(["scripts/**/*.mjs", "*.mjs"]),
  ...react(["packages/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}"]),
  ...designSystem({ files: ["packages/ui/src/components/**/*.{ts,tsx}"] }),
  ...testOverrides,
];
