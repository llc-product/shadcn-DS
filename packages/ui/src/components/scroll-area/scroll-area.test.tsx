import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScrollArea, ScrollBar } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders its content inside a viewport", () => {
    render(
      <ScrollArea className="h-24">
        <p>Long content</p>
      </ScrollArea>,
    );
    expect(screen.getByText("Long content")).toBeInTheDocument();
  });

  it("takes its height from className — the component sets no height of its own", () => {
    // A scroll area with no bounded height does not scroll. That bound is always the caller's,
    // which is why className has to reach the root element.
    const { container } = render(<ScrollArea className="h-24">x</ScrollArea>);
    expect(container.firstElementChild).toHaveClass("h-24", "overflow-hidden");
  });

  it("puts content in a Radix viewport, so a scrollbar has something to measure", () => {
    // What is NOT asserted, deliberately: that a scrollbar appears. Radix mounts one only after
    // it detects overflow, and jsdom has no layout engine, so nothing ever overflows here. A
    // test that "proved" the scrollbar renders would only be proving the stub in vitest.setup.ts.
    // Scrollbar behaviour belongs in a browser test; this covers the structure it depends on.
    const { container } = render(
      <ScrollArea>
        <div>x</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>,
    );
    expect(container.querySelector("[data-radix-scroll-area-viewport]")).toBeTruthy();
  });
});
