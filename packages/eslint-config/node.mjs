// @digitaltwin/eslint-config/node — build scripts and config files.
//
// Only globals. Node scripts in these repos are plain .mjs run by CI, and every rule they need is
// already in base; what they lack without this is `process`, `console` and friends.
import globals from "globals";

/** @param {string[]} files glob(s) the Node globals apply to. */
export const node = (files = ["scripts/**/*.mjs", "*.mjs"]) => [
  {
    files,
    languageOptions: { globals: globals.node },
  },
];

export default node;
