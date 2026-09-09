import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  inputGroupAddonVariants,
} from "./input-group";

describe("InputGroup", () => {
  it("types into the grouped input", async () => {
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Site" />
      </InputGroup>,
    );
    const input = screen.getByRole("textbox", { name: "Site" });
    await userEvent.type(input, "example.com");
    expect(input).toHaveValue("example.com");
    expect(screen.getByText("https://")).toBeInTheDocument();
  });

  it("does not accept input when disabled", async () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Site" disabled />
      </InputGroup>,
    );
    const input = screen.getByRole("textbox", { name: "Site" });
    await userEvent.type(input, "nope");
    expect(input).toHaveValue("");
  });

  it("lets className win over the border it conflicts with", () => {
    render(<InputGroup className="border-0" data-testid="group" />);
    const group = screen.getByTestId("group");
    expect(group).toHaveClass("border-0");
    expect(group).not.toHaveClass("border");
  });

  describe.each([
    ["inline-start", "order-first"],
    ["inline-end", "order-last"],
    ["block-start", "order-first"],
    ["block-end", "order-last"],
  ] as const)("addon align %s", (align, expected) => {
    it(`uses ${expected}`, () => {
      expect(inputGroupAddonVariants({ align })).toContain(expected);
    });
  });

  it("defaults the addon to inline-start", () => {
    expect(inputGroupAddonVariants({})).toContain("pl-3");
  });

  describe("InputGroupButton", () => {
    it("defaults to type=button so it cannot submit the form it sits in", () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <InputGroup>
            <InputGroupInput aria-label="Search" />
            <InputGroupButton>Clear</InputGroupButton>
          </InputGroup>
        </form>,
      );
      expect(screen.getByRole("button", { name: "Clear" })).toHaveAttribute(
        "type",
        "button",
      );
    });

    it("calls onClick", async () => {
      const onClick = vi.fn();
      render(<InputGroupButton onClick={onClick}>Clear</InputGroupButton>);
      await userEvent.click(screen.getByRole("button", { name: "Clear" }));
      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
