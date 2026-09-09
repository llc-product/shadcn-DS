import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Label } from "./label";

describe("Label", () => {
  it("associates with the control it names", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    );
    // Resolving by label text is the assertion: it fails if the association breaks, which is the
    // only thing a Label is for.
    expect(screen.getByLabelText("Email").tagName).toBe("INPUT");
  });

  it("merges className", () => {
    render(<Label className="text-destructive">Required</Label>);
    expect(screen.getByText("Required")).toHaveClass("text-destructive");
  });
});
