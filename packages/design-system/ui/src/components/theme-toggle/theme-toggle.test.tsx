import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { describe, expect, it } from "vitest";

import { ThemeToggle } from "./theme-toggle";

const wrap = (ui: React.ReactNode) =>
  render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {ui}
    </ThemeProvider>,
  );

describe("ThemeToggle", () => {
  it("switches the theme class on the document", async () => {
    wrap(<ThemeToggle />);
    expect(document.documentElement).not.toHaveClass("dark");

    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement).toHaveClass("dark");
  });

  it("has an accessible name by default", () => {
    wrap(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Toggle theme");
  });

  it("takes a translated name, because the design system does not know the language", () => {
    wrap(<ThemeToggle label="Đổi giao diện" />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Đổi giao diện");
  });
});
