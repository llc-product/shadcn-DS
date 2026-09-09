// @digitaltwin/utils — helpers with no framework and no app knowledge.
//
// Named for what it holds, not "utils as a bucket": everything here is a pure function over values
// a caller already has. Anything that reads configuration, touches the DOM, or knows about a
// request belongs in the package that owns that concern.
export { cn } from "./cn.js";
export {
  DEFAULT_FORMAT_LOCALE,
  formatCompactNumber,
  formatNumber,
  type FormatNumberOptions,
} from "./format.js";
