import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function Fixture() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogClose>Cancel</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("is closed until the trigger is used", async () => {
    render(<Fixture />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("takes its accessible name and description from the title and description", async () => {
    // Radix wires aria-labelledby/aria-describedby only if these components are used. Rendering
    // a bare <h2> instead leaves the dialog unnamed, and nothing visibly breaks.
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Delete project");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("closes on Escape and on the close control", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
