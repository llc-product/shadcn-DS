# Component authoring standard

The **mandatory** rules for adding or changing a component in `packages/design-system/ui`. Follow them so every
component types, styles and behaves the same way.
**Reference implementation: [`packages/design-system/ui/src/components/button/`](../packages/design-system/ui/src/components/button).**

---

## Folder layout — one folder per component, with a barrel

```
packages/design-system/ui/src/components/<name>/
  <name>.tsx        # the component (or the family: Card + CardHeader + CardTitle …)
  <name>.test.tsx   # behaviour, not snapshots
  <name>.json       # OPTIONAL sidecar — only what the source cannot say (see §7)
  index.ts          # the folder's public barrel
```

`index.ts` names the public symbols explicitly:

```ts
export { Button, buttonVariants, type ButtonProps } from "./button";
```

`components/index.ts` then re-exports **the folder, one line each** — never per file:

```ts
export * from "./button";
```

That split is what keeps adding a component a one-line change: the folder decides what of itself
is public, the barrel decides only which folders exist.

---

## 1. The file header, then the directive

Every file opens with a one-line header saying what the component **is** and what it wraps. The
catalog generator reads this line, so it ends up in `docs/components.md` verbatim.

```tsx
// components/dialog.tsx — modal overlay with focus trap and scroll lock (Radix Dialog).
"use client";
```

A comment before `"use client"` is valid — comments are not statements, so the directive prologue
is intact. `dist-directives.test.ts` verifies that end to end.

## 2. `"use client"` only when the component genuinely needs the client

Add it for state, effects, event handlers, context, or any Radix primitive. Leave it off
otherwise — `Button`, `Card`, `Badge`, `Table` and `Alert` are all server-renderable, and that is
not an accident to preserve by luck. **Every directive costs the consuming app a client
reference**, and the build deliberately does not bundle so that cost stays per-file.

## 3. No `forwardRef`

React 19 passes `ref` as an ordinary prop. Write a plain function component.

```tsx
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("h-9 rounded-md border", className)} {...props} />;
}
```

## 4. `cn()` last, always

```tsx
className={cn(buttonVariants({ variant, size }), className)}
```

`className` is the final argument so a caller's `bg-secondary` **replaces** the variant's
`bg-primary` instead of racing it in the cascade. `cn()` is `clsx` + `tailwind-merge`; it is what
makes that replacement deterministic. Getting the order wrong produces a component that works
until someone overrides it.

## 5. CVA only where variants exist, exported as `<name>Variants`

```tsx
export const buttonVariants = cva("inline-flex items-center …", {
  variants: { variant: { … }, size: { … } },
  defaultVariants: { variant: "default", size: "default" },
});
```

Export it: sibling components compose it (`PaginationLink`, `AlertDialogAction` and
`ToggleGroupItem` all do) rather than re-describing the same look.

A component with a single appearance gets no CVA. One variant is not a scale.

## 6. Tokens only — no hardcoded values, ever

Colour, spacing, radius, size, shadow, type. All of it comes from the token layer.

```tsx
"bg-primary text-primary-foreground rounded-md h-9 px-4"; // yes
"bg-[#ff5722] p-[13px] rounded-[10px]"; // no — lint blocks all three
```

`eslint.config.mjs` rejects arbitrary values carrying a magnitude or a colour. Two things are
**not** blocked, deliberately:

- **arbitrary variants** — `data-[state=open]:bg-accent`, `[&_svg]:size-4`. The bracket sits
  before the colon; it selects, it does not set a value. Every Radix component is built on these.
- **`var()` and CSS keywords** — `min-w-[var(--radix-select-trigger-width)]` is a value Radix
  computes at runtime and no token can express; `rounded-[inherit]` is not a magic number.

If a design asks for a value no token has, **use the nearest token and report the substitution**.
A 13px gap becomes `gap-3`. Never invent a token to match, and never edit one to make a finding
disappear — `packages/design-system/ui/src/styles/tokens.test.ts` is a contrast gate, not a formality.

## 7. Sidecar JSON — only what the source cannot say

There is no hand-maintained list of props. The source **is** the API, `build-catalog.mjs` derives
the catalog from it, and a duplicate list would be the thing that drifts.

Add `<name>.json` only for what is genuinely not in the code:

```jsonc
{
  "figma": { "page": "Button", "nodeId": "2043:2974" },
  "guidance": "Use `link` for navigation inside a sentence; use a real link element for anything a user might open in a new tab.",
  "example": "<Button variant=\"destructive\" size=\"sm\">Delete</Button>",
}
```

Omit the file when there is nothing to add.

## 8. No user-visible English that a caller cannot replace

A primitive does not know what language it is rendering in. Every string a person can see or hear
is a **default**, never a decision:

- put `{...props}` **after** the default so an `aria-label` can be overridden (`Spinner`)
- take a typed prop with a default when there is no attribute to spread onto (`ThemeToggle`)
- fall back to `children` for visible text (`PaginationPrevious`, `BreadcrumbSeparator`)

`packages/design-system/ui` may not import `next-intl`, or anything else that decides a locale. The app does that.

## 9. No framework imports

`next`, `next/link`, `next/navigation` are all lint-blocked inside the package. A primitive has to
work in the docs app, in the consuming app, and in any other React 19 renderer. A component that
needs routing takes `asChild` and lets the caller supply their own `Link`:

```tsx
<Button asChild>
  <Link href="/settings">Settings</Link>
</Button>
```

## 10. Tests assert behaviour, not markup

Query by role and accessible name. That way the test fails when the component stops being usable,
not when a class name changes.

```tsx
expect(screen.getByRole("dialog")).toHaveAccessibleName("Delete project"); // yes
expect(container.firstChild).toMatchSnapshot(); // no
```

Cover, at minimum: it renders; `className` merges over the variant it conflicts with; each
interactive path (click, keyboard, disabled); and the accessible name / role / state.

**Do not assert what jsdom cannot do.** It has no layout engine, so scrollbar visibility, hover
delays and drag do not work there. Say so in a comment and leave it to a browser test —
`scroll-area.test.tsx`, `hover-card.test.tsx` and `radio-group.test.tsx` each record one of these.

## 11. Before you open the merge request

```bash
npm run check     # format · lint · tokens · types · build · tests + coverage ratchet
```

Then add the component to `components/index.ts` under the right section comment, and re-run
`npm run build:catalog`.
