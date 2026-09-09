import Link from "next/link";

import { ThemeToggle } from "@digitaltwin/design-system";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/tokens/", label: "Tokens" },
  { href: "/components/", label: "Components" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
        <Link href="/" className="font-medium">
          <span className="text-primary-strong">@digitaltwin</span>/design-system
        </Link>
        <ul className="flex flex-1 gap-4 text-sm text-muted-foreground">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <ThemeToggle />
      </nav>
    </header>
  );
}
