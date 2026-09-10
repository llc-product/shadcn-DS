import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "./field";

describe("Field", () => {
  it("wires the label to its control, so clicking the label focuses the input", () => {
    render(
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <input id="email" />
        <FieldDescription>We never share it.</FieldDescription>
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toBe(screen.getByRole("textbox"));
    expect(screen.getByText("We never share it.")).toBeInTheDocument();
  });

  it("names a fieldset through its legend", () => {
    render(
      <FieldSet>
        <FieldLegend>Billing</FieldLegend>
        <FieldGroup>
          <FieldContent>
            <input aria-label="Card" />
          </FieldContent>
        </FieldGroup>
      </FieldSet>,
    );
    expect(screen.getByRole("group", { name: "Billing" })).toBeInTheDocument();
  });

  describe("FieldError", () => {
    it("announces the first non-empty error via role=alert", () => {
      render(<FieldError errors={[undefined, null, "Required", "Too short"]} />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Required");
      expect(alert).not.toHaveTextContent("Too short");
    });

    it("falls back to children when there is no error in the list", () => {
      render(<FieldError errors={[undefined, null]}>Check this field</FieldError>);
      expect(screen.getByRole("alert")).toHaveTextContent("Check this field");
    });

    it("renders nothing when there is neither an error nor children", () => {
      // This is what lets a form pass errors={fieldErrors} unconditionally at every call site.
      const { container } = render(<FieldError errors={[]} />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("renders nothing when errors is omitted entirely", () => {
      const { container } = render(<FieldError />);
      expect(container).toBeEmptyDOMElement();
    });

    it("lets className win over the colour it conflicts with", () => {
      render(<FieldError className="text-muted-foreground">Oops</FieldError>);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("text-muted-foreground");
      expect(alert).not.toHaveClass("text-destructive");
    });
  });

  describe("FieldSeparator", () => {
    it("renders its label between the two rules", () => {
      render(<FieldSeparator>or</FieldSeparator>);
      expect(screen.getByText("or")).toBeInTheDocument();
    });

    it("renders the rules alone when there is no label", () => {
      render(<FieldSeparator data-testid="sep" />);
      expect(screen.getByTestId("sep").querySelector("span")).toBeNull();
    });
  });
});
