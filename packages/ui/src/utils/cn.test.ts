// Unit test: the class-name merger.
// Small, but every component depends on it, and the one behaviour that is not obvious is that
// a LATER Tailwind class must beat an earlier conflicting one. Plain concatenation gets that
// wrong, and the result is a component whose variant prop silently does nothing.
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins plain class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("supports conditional objects and arrays", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  it("lets the later Tailwind class win a conflict", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("keeps non-conflicting utilities from the same group", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("returns an empty string when given nothing", () => {
    expect(cn()).toBe("");
  });
});
