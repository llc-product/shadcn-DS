import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

function Example(props: React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible {...props}>
      <CollapsibleTrigger>Details</CollapsibleTrigger>
      <CollapsibleContent>Hidden body</CollapsibleContent>
    </Collapsible>
  );
}

describe("Collapsible", () => {
  it("starts closed and reports it on the trigger", () => {
    render(<Example />);
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Hidden body")).not.toBeInTheDocument();
  });

  it("opens and closes on click, keeping aria-expanded truthful", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Details" });

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hidden body")).toBeInTheDocument();

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("does not open when disabled", async () => {
    render(<Example disabled />);
    const trigger = screen.getByRole("button", { name: "Details" });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("lets className win over the overflow it conflicts with", () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleContent className="overflow-visible">Body</CollapsibleContent>
      </Collapsible>,
    );
    const content = screen.getByText("Body");
    expect(content).toHaveClass("overflow-visible");
    expect(content).not.toHaveClass("overflow-hidden");
  });
});
