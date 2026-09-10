// The merge semantics themselves are tested in @digitaltwin/utils, where the implementation lives.
// What this file guards is the RE-EXPORT: every component here calls `cn`, and the design system's
// public API promises it. A broken subpath or a renamed export would otherwise surface as fifty
// unrelated component failures rather than one clear one.
import { describe, expect, it } from "vitest";

import { cn } from "./cn";
import { cn as cnFromPublicApi } from "../index";

describe("cn re-export", () => {
  it("is the function from @digitaltwin/utils", () => {
    expect(typeof cn).toBe("function");
    expect(cnFromPublicApi).toBe(cn);
  });

  it("still merges conflicting Tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
