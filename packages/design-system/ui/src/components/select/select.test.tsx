import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

function Fixture(props: { onValueChange?: (v: string) => void }) {
  return (
    <Select onValueChange={props.onValueChange}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruit</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="pear">Pear</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("shows the placeholder until something is chosen", () => {
    render(<Fixture />);
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("opens, selects, and reflects the choice on the trigger", async () => {
    const onValueChange = vi.fn();
    render(<Fixture onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await userEvent.click(await screen.findByRole("option", { name: "Pear" }));

    expect(onValueChange).toHaveBeenCalledWith("pear");
    expect(screen.getByRole("combobox")).toHaveTextContent("Pear");
  });

  it("opens from the keyboard", async () => {
    render(<Fixture />);
    screen.getByRole("combobox").focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("does not open when disabled", async () => {
    render(
      <Select disabled>
        <SelectTrigger aria-label="Fruit">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
