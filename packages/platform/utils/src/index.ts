// @digitaltwin/utils — helpers with no framework and no app knowledge.
//
// Named for what it holds, not "utils as a bucket": everything here is a pure function over values
// a caller already has. Anything that reads configuration, touches the DOM, or knows about a
// request belongs in the package that owns that concern.
//
// `cn` used to live here and does not any more. Merging Tailwind classes is a design-system
// concern — it exists because components take `className`, and tailwind-merge is a dependency
// nothing else here needs — so it moved into @digitaltwin/design-system, which is the only place
// that was ever going to call it.
export {
  DEFAULT_FORMAT_LOCALE,
  formatCompactNumber,
  formatNumber,
  type FormatNumberOptions,
} from "./format.js";
