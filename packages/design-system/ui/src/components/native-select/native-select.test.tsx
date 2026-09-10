import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NativeSelect } from "./native-select";

function Options() {
  return (
    <>
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
    </>
  );
}

describe("NativeSelect", () => {
  it("renders a native combobox with its options", () => {
    render(
      <NativeSelect aria-label="Letter">
        <Options />
      </NativeSelect>,
    );
    expect(screen.getByRole("combobox", { name: "Letter" }).tagName).toBe("SELECT");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("changes value on selection", async () => {
    const onChange = vi.fn();
    render(
      <NativeSelect aria-label="Letter" defaultValue="a" onChange={onChange}>
        <Options />
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Letter" });
    await userEvent.selectOptions(select, "b");
    expect(select).toHaveValue("b");
    expect(onChange).toHaveBeenCalled();
  });

  it("does not change when disabled", async () => {
    render(
      <NativeSelect aria-label="Letter" defaultValue="a" disabled>
        <Options />
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Letter" });
    expect(select).toBeDisabled();
    await userEvent.selectOptions(select, "b").catch(() => {});
    expect(select).toHaveValue("a");
  });

  it("lets className win over the background it conflicts with", () => {
    render(
      <NativeSelect aria-label="Letter" className="bg-muted">
        <Options />
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Letter" });
    expect(select).toHaveClass("bg-muted");
    expect(select).not.toHaveClass("bg-background");
  });
});
