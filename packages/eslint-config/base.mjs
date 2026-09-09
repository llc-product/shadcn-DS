// @digitaltwin/eslint-config/base — what every @digitaltwin codebase agrees on.
//
// Exported as an array of flat-config objects, not as a finished config. A consumer spreads it and
// then adds its own layers; that is the whole reason flat config exists, and it is what lets one
// package serve both a library and a Next app without either inheriting the other's rules.
//
// `ignores` is deliberately NOT here. What is generated, and therefore what lint has no business
// reporting on, is a property of each repository.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export const base = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Underscore means "declared on purpose, unused on purpose" — the convention has to be
      // spelled out or the rule fights every destructure that skips a field.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

/** Tests may do what production code may not. Spread LAST so it wins. */
export const testOverrides = [
  {
    files: ["**/*.test.{ts,tsx}", "**/*.test.{js,mjs}"],
    rules: {
      "no-restricted-syntax": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default base;
