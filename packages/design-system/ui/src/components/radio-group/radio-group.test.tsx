import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RadioGroup, RadioGroupItem } from "./radio-group";

function Fixture(props: { onValueChange?: (v: string) => void } = {}) {
  return (
    <RadioGroup defaultValue="card" onValueChange={props.onValueChange}>
      <RadioGroupItem value="card" aria-label="Card" />
      <RadioGroupItem value="paypal" aria-label="PayPal" />
    </RadioGroup>
  );
}

describe("RadioGroup", () => {
  it("has exactly one selected option", async () => {
    render(<Fixture />);
    expect(screen.getByRole("radio", { name: "Card" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "PayPal" })).not.toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "PayPal" }));
    expect(screen.getByRole("radio", { name: "PayPal" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Card" })).not.toBeChecked();
  });

  it("moves focus between options with the arrow keys", async () => {
    // Roving focus: the group is one tab stop and the arrows walk it. That part is real DOM
    // behaviour and jsdom drives it.
    //
    // What is NOT asserted: that selection follows focus. Radix implements that by watching for
    // an arrow keydown on `document` and re-checking the item in its focus handler, and in jsdom
    // the roving-focus handler on the item fires before the document listener sets that flag, so
    // focus lands without selecting. Asserting it would mean asserting a jsdom artefact. Clicking
    // (the test above) covers selection; selection-follows-focus belongs in a browser test.
    render(<Fixture />);
    screen.getByRole("radio", { name: "Card" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "PayPal" })).toHaveFocus();
  });

  it("uses --primary for the indicator, which AA allows as a non-text element", () => {
    // 3.164:1 on a light ground clears the 3.0 bar for UI components but not the 4.5 bar for
    // text — the same measurement that made the link button variant reach for --primary-strong.
    render(<Fixture />);
    expect(screen.getByRole("radio", { name: "Card" })).toHaveClass("text-primary");
  });
});
