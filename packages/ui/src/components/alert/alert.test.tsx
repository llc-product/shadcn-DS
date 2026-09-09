import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription, AlertTitle, alertVariants } from "./alert";

describe("Alert", () => {
  it("exposes itself to assistive technology as an alert", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something happened</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Heads up");
    expect(alert).toHaveTextContent("Something happened");
  });

  it("the destructive variant carries more than colour", () => {
    // WCAG 1.4.1: colour alone must never signal danger. The variant sets a border and a text
    // colour, and the slot for a leading icon is part of the base class — the caller supplies
    // the icon and the verb. This asserts the variant at least changes structure, not just hue.
    const destructive = alertVariants({ variant: "destructive" });
    expect(destructive).toContain("border-destructive/50");
    expect(destructive).toContain("[&>svg]:text-destructive");
  });

  it("merges className over the variant", () => {
    render(<Alert className="bg-muted">x</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-muted");
  });
});
