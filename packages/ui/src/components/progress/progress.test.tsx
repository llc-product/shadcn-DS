import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress } from "./progress";

describe("Progress", () => {
  it("reports its value to assistive technology", () => {
    // Regression guard. `value` used to be destructured out of props and never forwarded to the
    // Radix root, so the bar rendered at the right width and announced nothing — permanently
    // "indeterminate" to a screen reader. Visually invisible, which is why it survived.
    render(<Progress value={40} max={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("translates the indicator by the remaining percentage", () => {
    render(<Progress value={25} />);
    expect(screen.getByTestId("progress-indicator").style.transform).toBe(
      "translateX(-75%)",
    );
  });

  it("treats a missing value as zero rather than NaN", () => {
    // `value` is optional on the Radix type. Without the ?? 0 the transform would read
    // translateX(-NaN%) and the bar would render full — the opposite of what it means.
    render(<Progress />);
    expect(screen.getByTestId("progress-indicator").style.transform).toBe(
      "translateX(-100%)",
    );
  });
});
