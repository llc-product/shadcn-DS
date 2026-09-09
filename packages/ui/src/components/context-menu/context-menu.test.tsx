import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

function Fixture(props: { onSelect?: () => void }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>Canvas</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem onSelect={props.onSelect}>
            Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuCheckboxItem checked>Show grid</ContextMenuCheckboxItem>
        <ContextMenuRadioGroup value="px">
          <ContextMenuRadioItem value="px">Pixels</ContextMenuRadioItem>
          <ContextMenuRadioItem value="pt">Points</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Radix opens on the native contextmenu event, which userEvent has no gesture for. */
const rightClick = (element: HTMLElement) => fireEvent.contextMenu(element);

describe("ContextMenu", () => {
  it("stays closed until a right-click", async () => {
    render(<Fixture />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    rightClick(screen.getByText("Canvas"));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Rename/ })).toBeInTheDocument();
  });

  it("selects an item and closes", async () => {
    const onSelect = vi.fn();
    render(<Fixture onSelect={onSelect} />);
    rightClick(screen.getByText("Canvas"));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Rename/ }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("reports checkbox and radio state", async () => {
    render(<Fixture />);
    rightClick(screen.getByText("Canvas"));
    expect(
      await screen.findByRole("menuitemcheckbox", { name: "Show grid" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Pixels" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Points" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("closes on Escape", async () => {
    render(<Fixture />);
    rightClick(screen.getByText("Canvas"));
    await screen.findByRole("menu");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens a submenu from its trigger", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Canvas</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Export</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>As PNG</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    rightClick(screen.getByText("Canvas"));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Export/ }));
    expect(await screen.findByRole("menuitem", { name: "As PNG" })).toBeInTheDocument();
  });

  it("keeps the shortcut hint out of the item's accessible name", async () => {
    render(<Fixture />);
    rightClick(screen.getByText("Canvas"));
    expect(await screen.findByText("F2")).toHaveClass("ml-auto");
  });
});
