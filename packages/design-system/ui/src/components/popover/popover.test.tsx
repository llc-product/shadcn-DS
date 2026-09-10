import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";

describe("Popover", () => {
  it("opens on click and closes on Escape", async () => {
    render(
      <Popover>
        <PopoverTrigger>Filters</PopoverTrigger>
        <PopoverContent>Panel body</PopoverContent>
      </Popover>,
    );
    expect(screen.queryByText("Panel body")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(await screen.findByText("Panel body")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Panel body")).not.toBeInTheDocument();
  });

  it("marks the trigger's expanded state", async () => {
    render(
      <Popover>
        <PopoverTrigger>Filters</PopoverTrigger>
        <PopoverContent>Panel</PopoverContent>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Filters" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("can be driven as a controlled component", () => {
    render(
      <Popover open>
        <PopoverTrigger>T</PopoverTrigger>
        <PopoverContent>Always here</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("Always here")).toBeInTheDocument();
  });
});
