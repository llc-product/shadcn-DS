// The shape comes from @digitaltwin/testing; what stays here is what is genuinely local to this
// package — the generated file that coverage should ignore, and the ratchet's current numbers.
import { defineTestingConfig } from "@digitaltwin/testing";

export default defineTestingConfig({
  coverageExclude: [
    // Generated from tokens.export.json — the generator is what needs testing, and the contrast
    // gate tests its output directly.
    "src/tokens/tokens.ts",
  ],
  // A RATCHET set just under what the suite actually covers today (98.25 / 90.11 / 98.16 /
  // 98.03), not an aspiration. Raise these as tests are added; never lower them to make CI green.
  thresholds: { lines: 97, functions: 97, branches: 89, statements: 97 },
});
