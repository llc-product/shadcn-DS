"use client";

import { ThemeProvider } from "@digitaltwin/design-system";

export function Providers({ children }: { children: React.ReactNode }) {
  // attribute="class" is not a preference. tokens.css declares `.dark` and
  // `@custom-variant dark (&:is(.dark *))`, so the class is what every dark token keys off.
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
