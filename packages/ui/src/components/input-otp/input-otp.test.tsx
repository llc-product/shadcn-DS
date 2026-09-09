import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

function Fixture(props: { onChange?: (value: string) => void; disabled?: boolean }) {
  return (
    <InputOTP maxLength={4} aria-label="Verification code" {...props}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}

describe("InputOTP", () => {
  it("renders one field plus a separator between the two groups", () => {
    render(<Fixture />);
    expect(
      screen.getByRole("textbox", { name: "Verification code" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("puts each typed character into its own slot", async () => {
    const onChange = vi.fn();
    render(<Fixture onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Verification code" });
    await userEvent.type(input, "1234");
    expect(input).toHaveValue("1234");
    expect(onChange).toHaveBeenLastCalledWith("1234");
    for (const char of ["1", "2", "3", "4"]) {
      expect(screen.getByText(char)).toBeInTheDocument();
    }
  });

  it("stops at maxLength", async () => {
    render(<Fixture />);
    const input = screen.getByRole("textbox", { name: "Verification code" });
    await userEvent.type(input, "123456");
    expect(input).toHaveValue("1234");
  });

  it("accepts nothing when disabled", async () => {
    render(<Fixture disabled />);
    const input = screen.getByRole("textbox", { name: "Verification code" });
    expect(input).toBeDisabled();
    await userEvent.type(input, "12");
    expect(input).toHaveValue("");
  });

  it("renders an empty slot when the index has no character yet", () => {
    render(
      <InputOTP maxLength={2} aria-label="Code">
        <InputOTPGroup>
          <InputOTPSlot index={0} data-testid="slot-0" />
          {/* Out of range on purpose: the slot must fall back rather than throw. */}
          <InputOTPSlot index={9} data-testid="slot-9" />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(screen.getByTestId("slot-0")).toBeEmptyDOMElement();
    expect(screen.getByTestId("slot-9")).toBeEmptyDOMElement();
  });

  it("lets className win over the border radius it conflicts with", () => {
    render(
      <InputOTP maxLength={1} aria-label="Code">
        <InputOTPGroup className="gap-2" data-testid="group">
          <InputOTPSlot index={0} className="rounded-full" data-testid="slot" />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(screen.getByTestId("slot")).toHaveClass("rounded-full");
    expect(screen.getByTestId("group")).toHaveClass("gap-2");
  });
});
