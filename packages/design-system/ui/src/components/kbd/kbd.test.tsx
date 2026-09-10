import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Kbd, KbdGroup } from "./kbd";

describe("Kbd", () => {
  it("renders a real <kbd> so assistive tech announces it as keyboard input", () => {
    render(<Kbd>⌘</Kbd>);
    expect(screen.getByText("⌘").tagName).toBe("KBD");
  });

  it("lets className win over the background it conflicts with", () => {
    render(<Kbd className="bg-accent">K</Kbd>);
    const kbd = screen.getByText("K");
    expect(kbd).toHaveClass("bg-accent");
    expect(kbd).not.toHaveClass("bg-muted");
  });

  it("groups several keys into one row", () => {
    render(
      <KbdGroup data-testid="group">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    const group = screen.getByTestId("group");
    expect(group.querySelectorAll("kbd")).toHaveLength(2);
    expect(group).toHaveClass("inline-flex");
  });
});
