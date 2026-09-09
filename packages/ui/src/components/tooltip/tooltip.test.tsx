import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

function Fixture() {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger>Save</TooltipTrigger>
        <TooltipContent>Saves the draft</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("stays hidden until the trigger is focused", async () => {
    render(<Fixture />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await userEvent.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Saves the draft");
  });

  it("opens on keyboard focus, not only on hover", async () => {
    // The keyboard path is the accessibility requirement: a tooltip only reachable by pointer is
    // invisible to anyone navigating by tab.
    render(<Fixture />);
    screen.getByRole("button", { name: /Save/ }).focus();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<Fixture />);
    await userEvent.tab();
    await screen.findByRole("tooltip");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
