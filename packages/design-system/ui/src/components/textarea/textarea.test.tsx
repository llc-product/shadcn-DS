import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("accepts typed text", async () => {
    render(<Textarea aria-label="Notes" />);
    const el = screen.getByLabelText("Notes");
    await userEvent.type(el, "hello");
    expect(el).toHaveValue("hello");
  });

  it("respects rows and merges className", () => {
    render(<Textarea aria-label="N" rows={7} className="resize-none" />);
    const el = screen.getByLabelText("N");
    expect(el).toHaveAttribute("rows", "7");
    expect(el).toHaveClass("resize-none");
  });
});
