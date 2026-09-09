import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a pulsing muted placeholder", () => {
    const { container } = render(<Skeleton data-testid="s" />);
    const el = container.firstElementChild!;
    expect(el).toHaveClass("animate-pulse", "bg-muted");
  });

  it("takes sizing from className", () => {
    const { container } = render(<Skeleton className="h-8 w-full" />);
    expect(container.firstElementChild).toHaveClass("h-8", "w-full");
  });
});
