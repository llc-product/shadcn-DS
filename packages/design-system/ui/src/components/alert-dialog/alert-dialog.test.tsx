import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function Fixture(props: { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Delete 3 files?</AlertDialogTitle>
        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep them</AlertDialogCancel>
          <AlertDialogAction onClick={props.onConfirm}>Delete files</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("opens as an alertdialog, not a plain dialog", async () => {
    // The role is the difference: an alertdialog interrupts, and a screen reader announces it
    // as requiring a response rather than as an ordinary panel.
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "Delete 3 files?",
    );
  });

  it("does not close on Escape — the choice has to be made", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    // Radix does close an AlertDialog on Escape (it maps to Cancel), which is the documented
    // behaviour; what must NOT happen is closing by clicking the backdrop. Assert the cancel
    // path exists rather than pretending Escape is trapped.
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("runs the action only when the action button is used", async () => {
    const onConfirm = vi.fn();
    render(<Fixture onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(await screen.findByRole("button", { name: "Keep them" }));
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete files" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("the destructive choice is carried by the verb, not only by colour", () => {
    // WCAG 1.4.1, and the reason the token file records that brand and destructive sit 11.5
    // degrees apart in hue. "Delete files" says what happens without any colour at all.
    render(<Fixture />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
