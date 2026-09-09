import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card", () => {
  it("composes header, body and footer", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Manage your plan</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    for (const text of ["Billing", "Manage your plan", "Body", "Footer"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("uses the card token pair, not the page background", () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstElementChild).toHaveClass("bg-card", "text-card-foreground");
  });

  it("renders the description as muted text", () => {
    render(<CardDescription>Sub</CardDescription>);
    expect(screen.getByText("Sub")).toHaveClass("text-muted-foreground");
  });
});
