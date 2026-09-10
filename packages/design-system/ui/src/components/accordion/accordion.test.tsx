import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

function Fixture(props: { type?: "single" | "multiple" } = {}) {
  const { type = "single" } = props;
  return (
    <Accordion type={type} collapsible={type === "single" ? true : undefined}>
      <AccordionItem value="a">
        <AccordionTrigger>First</AccordionTrigger>
        <AccordionContent>First body</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Second</AccordionTrigger>
        <AccordionContent>Second body</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("starts collapsed and opens on click", async () => {
    render(<Fixture />);
    expect(screen.queryByText("First body")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "First" }));
    expect(screen.getByText("First body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("keeps only one section open in single mode", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "First" }));
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.queryByText("First body")).not.toBeInTheDocument();
    expect(screen.getByText("Second body")).toBeInTheDocument();
  });

  it("allows several open in multiple mode", async () => {
    render(<Fixture type="multiple" />);
    await userEvent.click(screen.getByRole("button", { name: "First" }));
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.getByText("First body")).toBeInTheDocument();
    expect(screen.getByText("Second body")).toBeInTheDocument();
  });
});
