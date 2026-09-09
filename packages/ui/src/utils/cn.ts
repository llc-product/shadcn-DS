// utils/cn.ts — re-exported from @digitaltwin/utils.
//
// The implementation moved there so the consuming app stops keeping a second copy of a function
// that must behave identically in both. It stays exported from this package's public API because
// every component takes `className` and every consumer needs the same merge semantics — asking
// them to install a second package for one function would be the wrong trade.
export { cn } from "@digitaltwin/utils";
