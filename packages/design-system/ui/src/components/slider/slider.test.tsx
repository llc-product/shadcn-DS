import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Slider } from "./slider";

describe("Slider", () => {
  it("exposes a thumb with its value and range", () => {
    render(<Slider defaultValue={[40]} min={0} max={100} aria-label="Volume" />);
    const thumb = screen.getByRole("slider");
    expect(thumb).toHaveAttribute("aria-valuenow", "40");
    expect(thumb).toHaveAttribute("aria-valuemin", "0");
    expect(thumb).toHaveAttribute("aria-valuemax", "100");
  });

  it("steps with the arrow keys — the only interaction jsdom can drive", async () => {
    // Dragging needs real layout; keyboard does not. Keyboard is also the accessibility
    // requirement, so this is the interaction that actually has to work.
    const onValueChange = vi.fn();
    render(<Slider defaultValue={[50]} step={5} onValueChange={onValueChange} />);
    screen.getByRole("slider").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith([55]);
  });

  it("renders one thumb per value in a range", () => {
    render(<Slider defaultValue={[20, 80]} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });
});
