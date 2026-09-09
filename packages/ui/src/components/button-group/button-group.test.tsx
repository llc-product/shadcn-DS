import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "../button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
} from "./button-group";

describe("ButtonGroup", () => {
  it("exposes the group role so the buttons are announced as one control", () => {
    render(
      <ButtonGroup aria-label="Alignment">
        <Button>Left</Button>
        <Button>Right</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Alignment" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("lets className win over the direction it conflicts with", () => {
    render(
      <ButtonGroup className="flex-col">
        <Button>One</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group");
    expect(group).toHaveClass("flex-col");
    expect(group).not.toHaveClass("flex-row");
  });

  describe.each([
    ["horizontal", "flex-row"],
    ["vertical", "flex-col"],
  ] as const)("orientation %s", (orientation, expected) => {
    it(`uses ${expected}`, () => {
      expect(buttonGroupVariants({ orientation })).toContain(expected);
    });
  });

  it("defaults to horizontal", () => {
    expect(buttonGroupVariants({})).toContain("flex-row");
  });

  it("renders a text segment beside the buttons", () => {
    render(<ButtonGroupText>https://</ButtonGroupText>);
    expect(screen.getByText("https://")).toHaveClass("bg-muted");
  });

  it("renders a separator, vertical by default and horizontal on request", () => {
    const { rerender } = render(<ButtonGroupSeparator />);
    expect(screen.getByRole("separator")).toHaveClass("w-px");

    rerender(<ButtonGroupSeparator orientation="horizontal" />);
    expect(screen.getByRole("separator")).toHaveClass("h-px");
  });
});
