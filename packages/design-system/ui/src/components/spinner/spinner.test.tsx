import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("renders an animated icon", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("announces as a status with a default name", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Loading");
  });

  it("lets a localised app replace the name", () => {
    // The default is a fallback, not a decision. Props spread after the defaults for this reason;
    // if that order is ever reversed, an app in any other language silently announces "Loading".
    render(<Spinner aria-label="Đang tải" />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Đang tải");
  });
});
