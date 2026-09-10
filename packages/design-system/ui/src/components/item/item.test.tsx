import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
  itemMediaVariants,
  itemVariants,
} from "./item";

describe("Item", () => {
  it("renders a full row, and its text and actions stay reachable", () => {
    render(
      <ItemGroup>
        <Item>
          <ItemMedia variant="icon">
            <svg aria-hidden="true" />
          </ItemMedia>
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Billing</ItemTitle>
            </ItemHeader>
            <ItemDescription>Manage your plan.</ItemDescription>
            <ItemFooter>Updated today</ItemFooter>
          </ItemContent>
          <ItemActions>
            <button type="button">Edit</button>
          </ItemActions>
        </Item>
      </ItemGroup>,
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Manage your plan.")).toBeInTheDocument();
    expect(screen.getByText("Updated today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("renders a separator between rows", () => {
    render(<ItemSeparator />);
    expect(screen.getByRole("separator")).toHaveClass("h-px");
  });

  it("lets className win over the gap it conflicts with", () => {
    render(<Item className="p-0">Row</Item>);
    const item = screen.getByText("Row");
    expect(item).toHaveClass("p-0");
    expect(item).not.toHaveClass("p-4");
  });

  describe.each([
    ["default", "bg-transparent"],
    ["outline", "border-border"],
    ["muted", "bg-muted"],
  ] as const)("variant %s", (variant, expected) => {
    it(`uses ${expected}`, () => {
      expect(itemVariants({ variant })).toContain(expected);
    });
  });

  it.each(["default", "sm"] as const)("size %s produces padding", (size) => {
    expect(itemVariants({ size })).toMatch(/\bp-\d+\b/);
  });

  describe.each([
    ["default", ""],
    ["icon", "bg-muted"],
    ["image", "overflow-hidden"],
  ] as const)("media variant %s", (variant, expected) => {
    it(`renders ${expected || "unstyled"}`, () => {
      const classes = itemMediaVariants({ variant });
      expect(classes).toContain("shrink-0");
      if (expected) expect(classes).toContain(expected);
    });
  });
});
