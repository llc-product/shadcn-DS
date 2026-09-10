import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

describe("Table", () => {
  it("renders a real table with header, body, footer and caption", () => {
    render(
      <Table>
        <TableCaption>Invoices</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>INV-001</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    // Roles, not classes: a table that has lost its semantics still looks like a table.
    expect(screen.getByRole("table", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Invoice" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "INV-001" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("wraps the table so a wide one scrolls instead of breaking the page", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(container.firstElementChild).toHaveClass("overflow-auto", "w-full");
  });

  it("marks a selected row through data-state, not a hand-applied class", () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("row")).toHaveAttribute("data-state", "selected");
  });
});
