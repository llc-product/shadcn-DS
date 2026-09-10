import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

describe("Breadcrumb", () => {
  it("is a landmark whose last crumb is marked as the current page", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
  });

  it("hides the separator and the ellipsis from the accessibility tree", () => {
    // They are punctuation. Announcing "chevron right" between every crumb is noise.
    const { container } = render(
      <>
        <BreadcrumbSeparator />
        <BreadcrumbEllipsis />
      </>,
    );
    for (const el of container.children) expect(el).toHaveAttribute("aria-hidden");
  });

  it("lets the separator glyph be replaced", () => {
    render(<BreadcrumbSeparator>/</BreadcrumbSeparator>);
    expect(screen.getByText("/")).toBeInTheDocument();
  });
});
