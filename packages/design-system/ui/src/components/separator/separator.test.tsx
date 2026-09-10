import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Separator } from "./separator";

describe("Separator", () => {
  it("is decorative by default — hidden from the accessibility tree", () => {
    const { container } = render(<Separator />);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("h-px", "w-full");
  });

  it("becomes a real separator when it carries meaning", () => {
    render(<Separator decorative={false} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("swaps its axis classes when vertical", () => {
    const { container } = render(<Separator orientation="vertical" decorative={false} />);
    expect(container.firstElementChild).toHaveClass("h-full", "w-px");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});
