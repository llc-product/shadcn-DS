import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Calendar } from "./calendar";

const JUNE_2024 = new Date(2024, 5, 15);

describe("Calendar", () => {
  it("renders a month grid with its caption", () => {
    render(<Calendar mode="single" defaultMonth={JUNE_2024} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByText("June 2024")).toBeInTheDocument();
  });

  it("selects a day and reports it to the caller", async () => {
    const onSelect = vi.fn();
    render(<Calendar mode="single" defaultMonth={JUNE_2024} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /June 20th, 2024/ }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0]?.[0]).toBeInstanceOf(Date);
  });

  it("marks the selected day on its grid cell, and says so in the day's name", () => {
    // aria-selected sits on the gridcell, not the button inside it — that is the shape a screen
    // reader reads a date grid with. The button carries the state in its accessible name instead.
    render(
      <Calendar
        mode="single"
        defaultMonth={JUNE_2024}
        selected={new Date(2024, 5, 20)}
      />,
    );
    const day = screen.getByRole("button", { name: /June 20th, 2024, selected/ });
    expect(day.closest("td")).toHaveAttribute("aria-selected", "true");
  });

  it("does not select a disabled day", async () => {
    const onSelect = vi.fn();
    render(
      <Calendar
        mode="single"
        defaultMonth={JUNE_2024}
        onSelect={onSelect}
        disabled={{ before: new Date(2024, 5, 10) }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /June 5th, 2024/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("moves to the previous month from the nav button", async () => {
    render(<Calendar mode="single" defaultMonth={JUNE_2024} />);
    await userEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText("May 2024")).toBeInTheDocument();
  });

  it("lets className win over the padding it conflicts with", () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={JUNE_2024} className="p-0" />,
    );
    const root = container.querySelector(".p-0");
    expect(root).not.toBeNull();
    expect(root).not.toHaveClass("p-3");
  });
});
