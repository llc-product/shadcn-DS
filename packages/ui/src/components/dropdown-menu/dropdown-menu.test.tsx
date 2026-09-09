import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function Fixture(props: { onSelect?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Account</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={props.onSelect}>Profile</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked>Compact mode</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("opens on click and exposes its items", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Profile" })).toBeInTheDocument();
  });

  it("selects an item and closes", async () => {
    const onSelect = vi.fn();
    render(<Fixture onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Profile" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("reports a checkbox item's state", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(
      await screen.findByRole("menuitemcheckbox", { name: "Compact mode" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("closes on Escape", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    await screen.findByRole("menu");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("DropdownMenu — submenus, radios and shortcuts", () => {
  it("opens a submenu from its trigger", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Account</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Invite</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>By email</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: /Invite/ }));
    expect(await screen.findByRole("menuitem", { name: "By email" })).toBeInTheDocument();
  });

  it("keeps one radio item selected at a time", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>View</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="list">
            <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(await screen.findByRole("menuitemradio", { name: "List" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Grid" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("renders a shortcut hint that stays out of the item's accessible name", async () => {
    // The hint is a visual affordance. A screen reader announcing "Profile ⌘P" for every item
    // is noise, and the keystroke is not what the item is called.
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Account</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(await screen.findByText("⌘P")).toHaveClass("ml-auto", "opacity-60");
  });

  it("groups items under a label", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Account</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>Team</DropdownMenuLabel>
            <DropdownMenuItem>Members</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(await screen.findByText("Team")).toHaveClass("pl-8");
    expect(screen.getByRole("group")).toBeInTheDocument();
  });
});
