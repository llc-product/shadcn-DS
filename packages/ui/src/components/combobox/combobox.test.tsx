import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Combobox, type ComboboxOption } from "./combobox";

const OPTIONS: ComboboxOption[] = [
  { label: "Next.js", value: "next" },
  { label: "SvelteKit", value: "svelte" },
  { label: "Nuxt", value: "nuxt" },
];

describe("Combobox", () => {
  it("shows the placeholder until something is chosen", () => {
    render(<Combobox options={OPTIONS} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Select an option");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the selected option's label, not its value", () => {
    render(<Combobox options={OPTIONS} value="next" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Next.js");
  });

  it("opens the list and reports the value the caller asked for", async () => {
    const onValueChange = vi.fn();
    render(<Combobox options={OPTIONS} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "SvelteKit" }));
    expect(onValueChange).toHaveBeenCalledWith("svelte");
  });

  it("clears the selection when the chosen option is picked again", async () => {
    const onValueChange = vi.fn();
    render(<Combobox options={OPTIONS} value="next" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Next.js" }));
    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("filters as the search narrows, and shows the empty text when nothing matches", async () => {
    render(<Combobox options={OPTIONS} />);
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Search…");

    await userEvent.type(search, "sve");
    expect(screen.getByRole("option", { name: "SvelteKit" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Nuxt" })).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "zzz");
    expect(await screen.findByText("No results found.")).toBeInTheDocument();
  });

  it("takes replacements for every user-visible string", async () => {
    render(
      <Combobox
        options={OPTIONS}
        placeholder="Chọn một mục"
        searchPlaceholder="Tìm kiếm…"
        emptyText="Không có kết quả."
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Chọn một mục");
    await userEvent.click(screen.getByRole("combobox"));
    const search = await screen.findByPlaceholderText("Tìm kiếm…");
    await userEvent.type(search, "zzz");
    expect(await screen.findByText("Không có kết quả.")).toBeInTheDocument();
  });

  it("lets className win over the width it conflicts with", () => {
    render(<Combobox options={OPTIONS} className="w-40" />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("w-40");
    expect(trigger).not.toHaveClass("w-full");
  });
});
