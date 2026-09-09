import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./date-picker";

const JUNE_20 = new Date(2024, 5, 20);

describe("DatePicker", () => {
  it("shows the placeholder until a date is picked", () => {
    render(<DatePicker />);
    expect(screen.getByRole("button")).toHaveTextContent("Pick a date");
  });

  it("formats the chosen date with the locale the caller supplies", () => {
    // A primitive cannot read the app's locale, so this prop is the whole contract. en-US and
    // vi-VN order the parts differently, which is what makes this assertion mean something.
    const { rerender } = render(<DatePicker value={JUNE_20} locale="en-US" />);
    expect(screen.getByRole("button")).toHaveTextContent("June 20, 2024");

    rerender(<DatePicker value={JUNE_20} locale="vi-VN" />);
    expect(screen.getByRole("button")).toHaveTextContent("20 tháng 6, 2024");
  });

  it("takes a replacement placeholder", () => {
    render(<DatePicker placeholder="Chọn ngày" />);
    expect(screen.getByRole("button")).toHaveTextContent("Chọn ngày");
    expect(screen.queryByText("Pick a date")).not.toBeInTheDocument();
  });

  it("opens the calendar, reports the picked date and closes", async () => {
    // `value` also decides which month the calendar opens on, so pinning it is what makes a
    // fixed date reachable here instead of whatever month the test happens to run in.
    const onChange = vi.fn();
    render(<DatePicker value={JUNE_20} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));

    await userEvent.click(await screen.findByRole("button", { name: /June 21st, 2024/ }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0]).toBeInstanceOf(Date);
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("opens on the month of the current value, not on today", () => {
    // react-day-picker does not derive the displayed month from `selected`. Without DatePicker
    // passing defaultMonth, a value set in June opens the grid on whatever month it is now.
    render(<DatePicker value={JUNE_20} locale="en-US" />);
    expect(screen.getByRole("button", { name: /June 20, 2024/ })).toBeInTheDocument();
  });

  it("mutes the trigger while empty and stops muting once a date is set", () => {
    const { rerender } = render(<DatePicker />);
    expect(screen.getByRole("button")).toHaveClass("text-muted-foreground");

    rerender(<DatePicker value={JUNE_20} />);
    expect(screen.getByRole("button")).not.toHaveClass("text-muted-foreground");
  });

  it("lets className win over the width it conflicts with", () => {
    render(<DatePicker className="w-40" />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveClass("w-40");
    expect(trigger).not.toHaveClass("w-full");
  });
});
