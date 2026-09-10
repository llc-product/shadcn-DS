import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("toggles on click and reports the change", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Accept" });
    expect(box).not.toBeChecked();

    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("toggles with the space key", async () => {
    render(<Checkbox aria-label="Accept" />);
    const box = screen.getByRole("checkbox");
    box.focus();
    await userEvent.keyboard(" ");
    expect(box).toBeChecked();
  });

  it("exposes the indeterminate state as mixed", () => {
    render(<Checkbox aria-label="All" checked="indeterminate" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
  });

  it("ignores clicks when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept" disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
