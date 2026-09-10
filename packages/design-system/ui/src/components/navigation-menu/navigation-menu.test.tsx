import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

// No explicit <NavigationMenuViewport />: the root renders one itself unless viewport={false},
// and a second copy would duplicate every panel link in the tree.
function Fixture(props: { viewport?: boolean }) {
  return (
    <NavigationMenu viewport={props.viewport}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/analytics">Analytics</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/pricing">Pricing</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuIndicator />
    </NavigationMenu>
  );
}

describe("NavigationMenu", () => {
  it("renders a navigation landmark with its top-level links", () => {
    render(<Fixture />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("keeps the panel closed until the trigger is used", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: /Products/ });
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(screen.queryByRole("link", { name: "Analytics" })).not.toBeInTheDocument();

    await userEvent.click(trigger);
    expect(await screen.findByRole("link", { name: "Analytics" })).toHaveAttribute(
      "href",
      "/analytics",
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes again on a second click", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: /Products/ });
    await userEvent.click(trigger);
    await screen.findByRole("link", { name: "Analytics" });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("still opens the panel with viewport={false}, rendering it in place", async () => {
    render(<Fixture viewport={false} />);
    await userEvent.click(screen.getByRole("button", { name: /Products/ }));
    expect(await screen.findByRole("link", { name: "Analytics" })).toBeInTheDocument();
  });

  it("exports the trigger style so a plain link can match a trigger", () => {
    // This is the reason navigationMenuTriggerStyle is public: a NavigationMenuLink sitting
    // beside a trigger has to look identical without re-describing the look.
    const classes = navigationMenuTriggerStyle();
    expect(classes).toContain("bg-background");
    expect(classes).toContain("hover:bg-accent");
  });

  it("lets className win over the trigger background it conflicts with", () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-muted">Docs</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const trigger = screen.getByRole("button", { name: /Docs/ });
    expect(trigger).toHaveClass("bg-muted");
    expect(trigger).not.toHaveClass("bg-background");
  });
});
