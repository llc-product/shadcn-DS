// Small, but every component depends on it, and the one behaviour that is not obvious is that a
// LATER Tailwind class must beat an earlier conflicting one. Plain concatenation gets that wrong,
// and the result is a component whose variant prop silently does nothing.
import { describe, expect, it } from "vitest";

import { cn } from "./cn.js";
import { cn as cnFromPublicApi } from "../index.js";

describe("cn", () => {
  it("joins plain class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values instead of rendering them", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("takes arrays and conditional objects, like clsx", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("lets a LATER conflicting Tailwind class win", () => {
    // The reason this wraps twMerge and not just clsx: a caller passing `bg-secondary` to a
    // component whose variant sets `bg-primary` must end up with one background, not two and a
    // cascade coin-flip.
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("bg-primary", "bg-secondary")).toBe("bg-secondary");
  });

  it("keeps classes that only look like they conflict", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("is reachable from the package's public API", () => {
    // Components use it internally, but a consumer overriding classes needs the same function.
    expect(cnFromPublicApi).toBe(cn);
  });
});
