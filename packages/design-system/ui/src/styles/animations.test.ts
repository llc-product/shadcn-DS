// @vitest-environment node
//
// Every `animate-*` a component reaches for must exist. That sounds obvious and was not true:
// `animate-in`, `animate-out` and `animate-caret-blink` were used by six components and defined
// nowhere, inherited from shadcn sources that assume `tw-animate-css` is installed. Nothing
// failed. The components opened and closed correctly, with no transition, and no build, test or
// lint said a word — a missing animation utility is a class name that matches no rule, which CSS
// treats as a request for nothing.
//
// So this reads the component sources for what they ask for and base.css for what is declared,
// and refuses the gap.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPONENTS = join(HERE, "../components");
const BASE_CSS = readFileSync(join(HERE, "base.css"), "utf8");

/**
 * Animations Tailwind ships. Listed rather than pattern-matched: the point is that anything NOT
 * on this list has to be declared here, and a regex clever enough to guess would let the next
 * inherited class through.
 */
const TAILWIND_BUILT_INS = new Set(["spin", "ping", "pulse", "bounce", "none"]);

/** `--animate-<name>:` in base.css — how Tailwind v4 declares a custom animation utility. */
const declared = new Set(
  [...BASE_CSS.matchAll(/--animate-([a-z0-9-]+)\s*:/g)].map((m) => m[1] as string),
);

/** Every `animate-<name>` written in a component, with the file that wrote it. */
const used = new Map<string, string[]>();
for (const entry of readdirSync(COMPONENTS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = join(COMPONENTS, entry.name, `${entry.name}.tsx`);
  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const match of source.matchAll(/\banimate-([a-z0-9-]+)/g)) {
    const name = match[1] as string;
    used.set(name, [...(used.get(name) ?? []), entry.name]);
  }
}

describe("animation utilities", () => {
  it("finds the animations the components use at all", () => {
    // Guards the guard: a regex matching nothing would make every case below vacuous.
    expect(used.size).toBeGreaterThan(2);
  });

  it.each([...used.entries()])(
    "animate-%s is defined, not inherited from a package nobody installed",
    (name, components) => {
      const known = TAILWIND_BUILT_INS.has(name) || declared.has(name);
      expect(
        known,
        `animate-${name} is used by ${[...new Set(components)].join(", ")} and is neither a ` +
          `Tailwind built-in nor declared in base.css. It will render as nothing.`,
      ).toBe(true);
    },
  );

  it("keeps the declared animations reachable to someone who asked for less motion", () => {
    // Removing the animation, not the state change: the components must still open and close.
    const reduced = BASE_CSS.slice(BASE_CSS.indexOf("prefers-reduced-motion"));
    for (const name of declared) {
      expect(reduced).toContain(`.animate-${name}`);
    }
    expect(reduced).toContain("animation: none");
  });

  it("drives its durations and easings from the motion tokens", () => {
    // A hardcoded 150ms here would be a second source of truth for a value tokens.export.json
    // already owns, and the one nobody would think to update.
    const declarations = [...BASE_CSS.matchAll(/--animate-[a-z0-9-]+:\s*([^;]+);/g)].map(
      (m) => m[1] as string,
    );
    expect(declarations.length).toBe(declared.size);
    for (const value of declarations) {
      expect(value).toMatch(/var\(--ease-[a-z]+\)/);
    }
  });
});
