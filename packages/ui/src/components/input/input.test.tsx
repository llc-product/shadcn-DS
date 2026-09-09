import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("accepts typed text", async () => {
    render(<Input aria-label="Email" />);
    const input = screen.getByLabelText("Email");
    await userEvent.type(input, "a@b.co");
    expect(input).toHaveValue("a@b.co");
  });

  it("forwards type and native attributes", () => {
    render(<Input aria-label="Age" type="number" min={0} />);
    const input = screen.getByLabelText("Age");
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("min", "0");
  });

  it("merges className", () => {
    render(<Input aria-label="X" className="w-24" />);
    expect(screen.getByLabelText("X")).toHaveClass("w-24");
  });
});
