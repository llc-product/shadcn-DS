import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("ToggleGroup", () => {
  it("selects one at a time in single mode", async () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="left" aria-label="Left">
          L
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Center">
          C
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Left" }));
    expect(screen.getByRole("radio", { name: "Left" })).toHaveAttribute(
      "data-state",
      "on",
    );

    await userEvent.click(screen.getByRole("radio", { name: "Center" }));
    expect(screen.getByRole("radio", { name: "Left" })).toHaveAttribute(
      "data-state",
      "off",
    );
  });

  it("selects several in multiple mode", async () => {
    render(
      <ToggleGroup type="multiple">
        <ToggleGroupItem value="b" aria-label="Bold">
          B
        </ToggleGroupItem>
        <ToggleGroupItem value="i" aria-label="Italic">
          I
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    await userEvent.click(screen.getByRole("button", { name: "Italic" }));
    for (const name of ["Bold", "Italic"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("data-state", "on");
    }
  });

  it("passes the group's variant and size down to items through context", () => {
    // The items read variant/size from a React context the group provides. If that link breaks,
    // a group set to `outline` renders default-looking children and nothing else fails.
    render(
      <ToggleGroup type="single" variant="outline" size="lg">
        <ToggleGroupItem value="a" aria-label="A">
          A
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("radio", { name: "A" })).toHaveClass("border");
  });
});
