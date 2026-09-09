import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  emptyMediaVariants,
} from "./empty";

describe("Empty", () => {
  it("renders a full empty state, and its text is readable to a screen reader", () => {
    render(
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <svg aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No projects</EmptyTitle>
          <EmptyDescription>Create one to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button">New project</button>
        </EmptyContent>
      </Empty>,
    );
    expect(screen.getByText("No projects")).toBeInTheDocument();
    expect(screen.getByText("Create one to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
  });

  it("lets className win over the padding it conflicts with", () => {
    render(<Empty className="p-2">Nothing here</Empty>);
    const empty = screen.getByText("Nothing here");
    expect(empty).toHaveClass("p-2");
    expect(empty).not.toHaveClass("p-8");
  });

  describe.each([
    ["default", ""],
    ["icon", "bg-muted"],
  ] as const)("media variant %s", (variant, expected) => {
    it(`renders ${expected || "unstyled"}`, () => {
      const classes = emptyMediaVariants({ variant });
      expect(classes).toContain("items-center");
      if (expected) expect(classes).toContain(expected);
      else expect(classes).not.toContain("bg-muted");
    });
  });

  it("keeps the description muted and the title not", () => {
    render(
      <>
        <EmptyTitle>Title</EmptyTitle>
        <EmptyDescription>Description</EmptyDescription>
      </>,
    );
    expect(screen.getByText("Description")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("Title")).not.toHaveClass("text-muted-foreground");
  });
});
