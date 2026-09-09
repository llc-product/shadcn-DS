import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Toggle, toggleVariants } from "./toggle";

describe("Toggle", () => {
  it("reports its pressed state and flips on click", async () => {
    render(<Toggle aria-label="Bold">B</Toggle>);
    const toggle = screen.getByRole("button", { name: "Bold" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("can be driven as a controlled component", async () => {
    const { rerender } = render(<Toggle aria-label="B" pressed={false} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    rerender(<Toggle aria-label="B" pressed />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("styles the on state through data-state so the class survives any variant", () => {
    expect(toggleVariants({})).toContain("data-[state=on]:bg-accent");
    expect(toggleVariants({ variant: "outline" })).toContain("data-[state=on]:bg-accent");
  });
});
