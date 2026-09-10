// components/theme-toggle.tsx — light/dark switch (uses next-themes).
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "../button/button.js";

export type ThemeToggleProps = {
  /**
   * Accessible name for the control. A default is provided so the button is never unlabelled,
   * but a localised app should pass its own translated string — the design system has no way to
   * know what language it is rendering in, and must not decide.
   */
  label?: string;
};

export function ThemeToggle({ label = "Toggle theme" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}
