// eslint.config.mjs — flat config for the design-system monorepo.
//
// Beyond the usual recommended sets, this file MECHANISES two rules that are otherwise enforced
// only by review, and therefore aren't enforced at all: a primitive may not reach for a raw value
// instead of a token, and a primitive may not know it lives in a Next.js app.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
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

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  // Node scripts.
  {
    files: ["scripts/**/*.mjs", "*.mjs"],
    languageOptions: { globals: globals.node },
  },

  // The library and the docs app.
  {
    files: ["packages/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // ── The two rules that make this a design system rather than a folder of components ──────────
  {
    files: ["packages/ui/src/components/**/*.{ts,tsx}"],
    rules: {
      // 1. FIDELITY: no hardcoded values. See .claude/rules/design-to-code.md in the consuming
      //    repo — "an arbitrary value is a private decision that no token can ever update".
      //
      //    What is banned is an arbitrary *value* carrying a magnitude or a colour: p-[13px],
      //    gap-[18px], rounded-[10px], bg-[#ff5722], bg-[oklch(...)]. Those must round to the
      //    nearest token and the substitution must be logged.
      //
      //    What is NOT banned, deliberately:
      //      · arbitrary VARIANTS — data-[state=open]:, [&_svg]: — the bracket sits before the
      //        colon and selects, it does not set a value. Radix components are built on these.
      //      · var() references — min-w-[var(--radix-select-trigger-width)] is a value Radix
      //        computes at runtime; no token can express it.
      //      · CSS keywords — rounded-[inherit] is not a magic number.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/-\\[(?:#[0-9a-fA-F]{3,8}|-?[0-9.]+[a-z%]*\\]|(?:rgb|rgba|hsl|hsla|oklch|oklab)\\()/]",
          message:
            "Hardcoded value in a class name. Use the nearest design token (Tailwind's 4px scale for geometry, a semantic colour for colour) and log the substitution. var() and CSS keywords are allowed.",
        },
        {
          selector:
            "TemplateElement[value.raw=/-\\[(?:#[0-9a-fA-F]{3,8}|-?[0-9.]+[a-z%]*\\])/]",
          message:
            "Hardcoded value in a class name. Use the nearest design token and log the substitution.",
        },
        {
          selector: "Literal[value=/#[0-9a-fA-F]{6}\\b/]",
          message:
            "Raw hex colour. Colour comes from a token — the palette lives in styles/tokens.css.",
        },
      ],

      // 2. LAYERING: a primitive knows nothing about the app that renders it. No framework
      //    coupling (it must work in any React 19 renderer), and no reaching upward into an app.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message:
                "A primitive must not import from next. It has to work in any React 19 renderer; the docs app and the consuming app both provide the framework.",
            },
            {
              group: ["@/*"],
              message:
                "No app-alias imports inside the package — use a relative path within packages/ui/src.",
            },
          ],
        },
      ],
    },
  },

  // Tests may do what production code may not.
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off", "@typescript-eslint/no-explicit-any": "off" },
  },
);
