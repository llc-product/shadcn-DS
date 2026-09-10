// @digitaltwin/eslint-config/react — React 19 source, in a browser or on a server renderer.
//
// react-hooks carries the rules that a type-checker genuinely cannot: a hook called conditionally
// type-checks perfectly and breaks at runtime.
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/** @param {string[]} files glob(s) holding React source. */
export const react = (files = ["**/*.{ts,tsx}"]) => [
  {
    files,
    languageOptions: {
      // Both, not one: a component renders in the browser and is also imported by a server
      // renderer, so narrowing to browser globals only makes the second case lint as an error.
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
];

export default react;
