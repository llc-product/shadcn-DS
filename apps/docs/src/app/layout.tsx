import type { Metadata } from "next";

import { Nav } from "@/ui/nav";
import { Providers } from "@/ui/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "@digitaltwin/design-system",
  description: "React 19 primitives on Tailwind v4 design tokens.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the theme class onto <html>
    // before React hydrates, so the server and client markup differ by design on this one node.
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Nav />
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
