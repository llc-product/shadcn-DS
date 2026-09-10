import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

function Fixture(props: { side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Sheet>
      <SheetTrigger>Menu</SheetTrigger>
      <SheetContent side={props.side}>
        <SheetTitle>Navigation</SheetTitle>
        <SheetDescription>Jump to a section</SheetDescription>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens as a named dialog", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("dialog")).toHaveAccessibleName("Navigation");
  });

  it("enters from the side it is told to", async () => {
    render(<Fixture side="left" />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("dialog")).toHaveClass("left-0");
  });

  it("closes on Escape", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Sheet — layout slots and the built-in close", () => {
  it("stacks a header and pins a footer to the bottom", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Jump to a section</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    expect(await screen.findByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Jump to a section")).toBeInTheDocument();
    expect(screen.getByText("Done").parentElement).toHaveClass("mt-auto");
  });

  it("ships a close control that screen readers can name", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Navigation</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    // The built-in corner control is an icon; its label lives in an sr-only span. Without it the
    // only way out of the sheet, for a screen-reader user, is an unlabelled button.
    expect(await screen.findByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("closes through the explicit close control", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Navigation</SheetTitle>
          <SheetClose>Done</SheetClose>
        </SheetContent>
      </Sheet>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
