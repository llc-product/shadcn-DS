import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  it("renders its children", () => {
    render(
      <ThemeProvider attribute="class">
        <p>App</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("App")).toBeInTheDocument();
  });

  it("puts the theme on a class, which is what the tokens key off", () => {
    // tokens.css declares `@custom-variant dark (&:is(.dark *))` and a `.dark` block. If this is
    // ever mounted with attribute="data-theme", every dark token silently stops applying and the
    // app renders light-on-light. The two have to agree, and this is where that is written down.
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <p>App</p>
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveClass("dark");
  });
});
