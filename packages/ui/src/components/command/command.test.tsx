import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

function Fixture(props: { onSelect?: () => void }) {
  return (
    <Command label="Commands">
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={props.onSelect}>
            Open settings
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem>Sign out</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem>Go to dashboard</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe("Command", () => {
  it("lists every item before anything is typed", () => {
    render(<Fixture />);
    expect(screen.getByRole("option", { name: /Open settings/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Go to dashboard" })).toBeInTheDocument();
  });

  it("filters the list as the query narrows", async () => {
    render(<Fixture />);
    await userEvent.type(screen.getByPlaceholderText("Type a command…"), "dash");
    expect(screen.getByRole("option", { name: "Go to dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", async () => {
    render(<Fixture />);
    await userEvent.type(screen.getByPlaceholderText("Type a command…"), "zzzzz");
    expect(await screen.findByText("No results found.")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("selects an item on click", async () => {
    const onSelect = vi.fn();
    render(<Fixture onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("option", { name: /Open settings/ }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("keeps the shortcut hint visually trailing", () => {
    render(<Fixture />);
    expect(screen.getByText("⌘,")).toHaveClass("ml-auto");
  });

  it("lets className win over the ground it conflicts with", () => {
    render(
      <Command label="Commands" className="bg-background" data-testid="root">
        <CommandList />
      </Command>,
    );
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("bg-background");
    expect(root).not.toHaveClass("bg-popover");
  });

  describe("CommandDialog", () => {
    it("renders the palette inside a dialog when open", async () => {
      render(
        <CommandDialog open>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandItem>Open settings</CommandItem>
          </CommandList>
        </CommandDialog>,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
    });

    it("renders nothing while closed", () => {
      render(
        <CommandDialog>
          <CommandList />
        </CommandDialog>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
