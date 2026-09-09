import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { describe, expect, it } from "vitest";

import { Toaster, toast } from "./sonner";

const wrap = (ui: React.ReactNode) =>
  render(<ThemeProvider attribute="class">{ui}</ThemeProvider>);

describe("Toaster", () => {
  it("mounts a polite live region before any toast exists", () => {
    // Sonner renders the region up front and only fills it later. That order is the point: a
    // live region created at the same moment as its first message is often not announced.
    wrap(<Toaster />);
    expect(document.querySelector("section")).toHaveAttribute("aria-live", "polite");
  });

  it("lets a localised app name that region", () => {
    // Sonner's default is the English "Notifications alt+T". Props spread last, so an app can
    // replace it — the same contract every other user-visible string in this package follows.
    wrap(<Toaster containerAriaLabel="Thông báo" />);
    // Sonner appends its keyboard hint to whatever label it is given, so this is a prefix match
    // rather than an equality one: the assertion is that the app's words got through, not that
    // they are the entire string.
    expect(document.querySelector("section")?.getAttribute("aria-label")).toMatch(
      /^Thông báo\b/,
    );
  });

  it("shows a toast raised through the imperative API", async () => {
    wrap(<Toaster />);
    toast("Saved");
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("paints toasts from the design tokens, not from Sonner's own palette", async () => {
    // Sonner colours itself from its own CSS variables. Mapping those onto the tokens is the
    // entire reason this wrapper exists — a bare <Toaster /> renders in Sonner's colours and
    // ignores the theme.
    wrap(<Toaster />);
    toast("Saved");
    await screen.findByText("Saved");

    const host = document.querySelector<HTMLElement>("[data-sonner-toaster]");
    expect(host?.style.getPropertyValue("--normal-bg")).toBe("var(--popover)");
    expect(host?.style.getPropertyValue("--normal-text")).toBe(
      "var(--popover-foreground)",
    );
    expect(host?.style.getPropertyValue("--normal-border")).toBe("var(--border)");
  });
});
