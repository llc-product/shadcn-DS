import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

describe("Pagination", () => {
  it("marks the active page with aria-current and the outline variant", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByRole("link", { name: "1" })).not.toHaveAttribute("aria-current");
    const active = screen.getByRole("link", { name: "2" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("border");
  });

  it("gives previous/next a default label and lets a localised app replace it", () => {
    const { rerender } = render(<PaginationPrevious href="#" />);
    expect(screen.getByText("Previous")).toBeInTheDocument();

    rerender(<PaginationPrevious href="#">Trước</PaginationPrevious>);
    expect(screen.getByText("Trước")).toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });

  it("the same is true of next", () => {
    render(<PaginationNext href="#">Sau</PaginationNext>);
    expect(screen.getByText("Sau")).toBeInTheDocument();
  });

  it("keeps the ellipsis out of the accessibility tree but readable by screen readers", () => {
    const { container } = render(<PaginationEllipsis />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
    expect(screen.getByText("More pages")).toHaveClass("sr-only");
  });
});
