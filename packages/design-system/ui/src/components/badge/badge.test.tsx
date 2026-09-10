import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge, badgeVariants } from "./badge";

describe("Badge", () => {
  it("renders its content", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("merges className over the variant", () => {
    render(<Badge className="bg-muted">Draft</Badge>);
    expect(screen.getByText("Draft")).toHaveClass("bg-muted");
  });

  it("every variant resolves to token classes, never a raw colour", () => {
    for (const variant of ["default", "secondary", "destructive", "outline"] as const) {
      expect(badgeVariants({ variant })).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });
});
