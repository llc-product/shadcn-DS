import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("supports the conditional object and array forms", () => {
    // Live in production: every CVA component calls `cn(variants({...}), className)`. These two
    // assertions were lost when cn moved out of packages/ui, and without them a mutation that
    // drops clsx entirely — emitting "a,[object Object]" — passes the whole suite.
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
    expect(cn({ a: true, b: false }, ["c"])).toBe("a c");
  });

  it("returns an empty string when given nothing", () => {
    expect(cn()).toBe("");
  });

  it("lets the LAST conflicting Tailwind class win", () => {
    // The whole reason tailwind-merge is here: `cn(base, className)` has to let a caller override
    // a default, and plain concatenation leaves both classes in and defers to source order in the
    // stylesheet instead.
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm text-foreground", "text-lg")).toBe("text-foreground text-lg");
  });
});
