import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

function Fixture(props: { onSelect?: () => void }) {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Document</MenubarLabel>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarItem onSelect={props.onSelect}>
              New
              <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
          </MenubarGroup>
          <MenubarCheckboxItem checked>Autosave</MenubarCheckboxItem>
          <MenubarRadioGroup value="light">
            <MenubarRadioItem value="light">Light</MenubarRadioItem>
            <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

describe("Menubar", () => {
  it("exposes a menubar with one menuitem per top-level menu", () => {
    render(<Fixture />);
    expect(screen.getByRole("menubar")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "File" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });

  it("opens a menu on click and marks its trigger expanded", async () => {
    render(<Fixture />);
    const file = screen.getByRole("menuitem", { name: "File" });
    await userEvent.click(file);
    expect(await screen.findByRole("menuitem", { name: /New/ })).toBeInTheDocument();
    expect(file).toHaveAttribute("aria-expanded", "true");
  });

  it("selects an item and closes", async () => {
    const onSelect = vi.fn();
    render(<Fixture onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /New/ }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menuitem", { name: /New/ })).not.toBeInTheDocument();
  });

  it("reports checkbox and radio state", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(
      await screen.findByRole("menuitemcheckbox", { name: "Autosave" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("closes on Escape", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    await screen.findByRole("menuitem", { name: /New/ });
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: /New/ })).not.toBeInTheDocument();
  });

  it("opens a submenu from its trigger", async () => {
    render(
      // Radix opens a Menubar menu through the root's value, not a per-menu defaultOpen.
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>By link</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: /Share/ }));
    expect(await screen.findByRole("menuitem", { name: "By link" })).toBeInTheDocument();
  });

  it("insets a label so it lines up with items that carry an indicator", async () => {
    render(
      <Menubar defaultValue="view">
        <MenubarMenu value="view">
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel inset>Layout</MenubarLabel>
            <MenubarItem inset>Columns</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(await screen.findByText("Layout")).toHaveClass("pl-8");
    expect(screen.getByRole("menuitem", { name: "Columns" })).toHaveClass("pl-8");
  });

  it("keeps the shortcut hint out of the item's accessible name", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(await screen.findByText("⌘N")).toHaveClass("ml-auto");
  });
});
