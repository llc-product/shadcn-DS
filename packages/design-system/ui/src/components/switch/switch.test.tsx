import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("flips on click and reports the change", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Notifications" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch", { name: "Notifications" });
    expect(control).not.toBeChecked();

    await userEvent.click(control);
    expect(control).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("is a switch, not a checkbox", () => {
    // The role is the difference a screen-reader user hears: "on/off" versus "checked". A switch
    // applies immediately; a checkbox waits for a submit.
    render(<Switch aria-label="X" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("stays put when disabled", async () => {
    render(<Switch aria-label="X" disabled />);
    await userEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
  });
});
