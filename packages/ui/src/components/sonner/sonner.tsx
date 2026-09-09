// components/sonner.tsx — toast host and the toast() imperative API (Sonner).
"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

// Re-export the imperative API: import { toast } from '@/components/ui'
export { toast } from "sonner";

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();
  return (
    <SonnerToaster
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
