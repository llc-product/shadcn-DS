import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders a button with its label", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClick, and does not when disabled", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders as the child element with asChild, keeping the variant classes", () => {
    render(
      <Button asChild>
        <a href="/next">Next</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Next" });
    expect(link).toHaveClass("bg-primary");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets className win over the variant it conflicts with", () => {
    // This is the whole reason cn() wraps twMerge rather than clsx alone: a caller passing
    // bg-secondary must not end up with two background utilities and a cascade coin-flip.
    render(<Button className="bg-secondary">Themed</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-secondary");
    expect(button).not.toHaveClass("bg-primary");
  });

  describe.each([
    ["default", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["outline", "border"],
    ["ghost", "hover:bg-accent"],
    ["destructive", "bg-destructive"],
    ["link", "text-primary-strong"],
  ] as const)("variant %s", (variant, expected) => {
    it(`uses ${expected}`, () => {
      expect(buttonVariants({ variant })).toContain(expected);
    });
  });

  it("the link variant does not use --primary as text", () => {
    // --primary measures 3.164:1 on a light ground: fine for a focus ring, a failure for text.
    // The contrast gate enforces the token; this enforces that the variant reaches for it.
    // (?![\w-]) rather than \b: \b matches before the hyphen, so text-primary-strong would trip it.
    expect(buttonVariants({ variant: "link" })).not.toMatch(/text-primary(?![\w-])/);
  });

  it.each(["sm", "default", "lg", "icon"] as const)(
    "size %s produces a height",
    (size) => {
      expect(buttonVariants({ size })).toMatch(/\b(h-\d+|size-\d+)\b/);
    },
  );
});
