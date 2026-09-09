import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

function Example(props: {
  withHandle?: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    // v4 of react-resizable-panels names this `orientation`; the old `direction` is silently
    // spread onto the div and does nothing.
    <ResizablePanelGroup orientation={props.orientation ?? "horizontal"}>
      <ResizablePanel defaultSize={50}>Left</ResizablePanel>
      <ResizableHandle withHandle={props.withHandle} />
      <ResizablePanel defaultSize={50}>Right</ResizablePanel>
    </ResizablePanelGroup>
  );
}

describe("Resizable", () => {
  it("renders both panes and a separator between them", () => {
    render(<Example />);
    expect(screen.getByText("Left")).toBeInTheDocument();
    expect(screen.getByText("Right")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("gives the separator a keyboard-reachable tabindex", () => {
    // Dragging needs a layout engine jsdom does not have; the keyboard path is the one a test
    // here can prove, and it is also the one that decides whether this is operable at all.
    render(<Example />);
    expect(screen.getByRole("separator")).toHaveAttribute("tabindex", "0");
  });

  it("renders the grip only when asked", () => {
    const { rerender } = render(<Example />);
    expect(screen.getByRole("separator").querySelector("div")).toBeNull();

    rerender(<Example withHandle />);
    expect(screen.getByRole("separator").querySelector("div")).not.toBeNull();
  });

  it("lets className win over the layout it conflicts with", () => {
    const { container } = render(
      <ResizablePanelGroup orientation="vertical" className="h-auto">
        <ResizablePanel>Only</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const group = container.firstElementChild as HTMLElement;
    expect(group).toHaveClass("h-auto");
    expect(group).not.toHaveClass("h-full");
  });
});
