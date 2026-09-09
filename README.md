# @digitaltwin/design-system

React 19 primitives on Tailwind v4 design tokens. 35 components, one token layer, one contrast
gate that fails the build rather than a review.

This is the React counterpart to [`libs/design-system`](https://gitlab.nailjob.us:8081/libs/design-system)
(Quasar/Vue). The two share a brand and a way of working, not a component kit.

```
packages/ui/     @digitaltwin/design-system — the published library
apps/docs/       the docs site (Next.js static export) — and the package's first real consumer
scripts/         the token pipeline and the catalog generators
docs/            component-authoring.md (the standard) · components.md (generated)
```

---

## Using it in an app

**1. Install** — from this project's GitLab npm registry:

```
@digitaltwin:registry=https://<gitlab-host>/api/v4/projects/<PROJECT_ID>/packages/npm/
```

```bash
npm install @digitaltwin/design-system
```

While there is no remote, link it instead:

```jsonc
// package.json
"@digitaltwin/design-system": "file:../design-system/packages/ui"
```

**2. Wire the stylesheet** — three lines, and the third is the one people forget:

```css
@import "tailwindcss";
@import "@digitaltwin/design-system/styles.css";
@source "../../node_modules/@digitaltwin/design-system/dist";
```

> **`@source` is not optional.** Tailwind v4 decides which utilities to emit by scanning source
> files, and it skips `node_modules` by default. Leave that line out and every component mounts
> with all the right class names and **no styles at all** — with no error to explain it. Adjust
> the relative path to wherever your CSS entry lives.

Finer-grained entry points, if the base layer is not wanted:
`@digitaltwin/design-system/tokens.css` (tokens only) and `/base.css` (the base layer only).

**3. Mount the theme provider** with `attribute="class"` — `tokens.css` declares `.dark` and
`@custom-variant dark (&:is(.dark *))`, so the class is what every dark token keys off:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
```

**4. Import components:**

```tsx
import { Button, Dialog, DialogContent, toast } from "@digitaltwin/design-system";
```

### Peer dependencies

`react` · `react-dom` · `lucide-react` · `tailwindcss` ^4, plus `next-themes` and `sonner` if you
use `ThemeProvider` / `ThemeToggle` / `Toaster`. They are peers rather than dependencies because
each keeps module-level state: two copies of `sonner` means `toast()` fires into a Toaster nobody
is looking at, and two copies of `next-themes` means the toggle and the provider disagree.

### Server components

24 of the 35 modules carry `"use client"`; the other 11 — `Button`, `Card`, `Badge`, `Table`,
`Alert`, `Breadcrumb`, `Pagination`, `Input`, `Textarea`, `Skeleton`, `Spinner` — render in a
Server Component and cost the route nothing. The build is deliberately **unbundled** so that
stays true per file rather than collapsing to "the whole library is a client reference".

`packages/ui` never imports `next`, so a component that needs routing takes `asChild`:

```tsx
<Button asChild>
  <Link href="/settings">Settings</Link>
</Button>
```

---

## Tokens

`tokens.export.json` is the snapshot. `scripts/build-tokens.mjs` turns it into
`packages/ui/src/styles/tokens.css` (custom properties + `@theme inline`) and
`packages/ui/src/tokens/tokens.ts` (the same values for code that cannot read a stylesheet — a
canvas, a chart, an email). Both are generated **and committed**, and CI rebuilds them and fails
on a diff.

```
tokens.raw.json  --sync-tokens-->  tokens.export.json  --build-tokens-->  tokens.css + tokens.ts
   (Figma dump)      (validate)        (the snapshot)      (generate)
```

**Figma: not yet.** There is no variable collection for the React DS, so `tokens.export.json` is
hand-seeded from the boilerplate's existing OKLCH palette, in exactly the shape a Figma export
produces. `sync-tokens.mjs` and `check-figma-drift.mjs` are written and run the day that
collection exists — no generator change needed.

### The contrast gate

`packages/ui/src/styles/tokens.test.ts` parses the generated stylesheet, converts OKLCH the way a
browser does, and asserts every pair that carries a WCAG obligation. Building this gate found two
real failures in the palette it inherited:

| Finding                                                               | Measured          | Fix                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--muted-foreground` on `--muted` — the exact pair `TabsList` renders | 4.339:1, below AA | neutral/500 darkened 0.556 → 0.54 (now 4.640:1). A 0.016 lightness step; invisible, and it was never a design decision, only an inherited default.                                                     |
| `--primary` as **text** on a light ground — the `link` button variant | 3.164:1, below AA | new `--primary-strong` token: brand-strong in light (6.064:1), the brand in dark (6.256:1). `--primary` stays exactly `#ff5722` and stays correct as a fill and as a focus ring, where 3.0 is the bar. |

**Never relax a threshold to land a design, and never edit a token to make a finding disappear.**
A failure there means the palette got less readable, which is the only thing that file is for.

### Two rules the palette carries with it

- `--primary-foreground` is near-black, not white. White on `#ff5722` measures **3.03:1** and
  fails AA; near-black is **6.26:1**. The brand hex stays exact and the text on it gets darker.
- Brand and destructive sit **11.5° apart in hue** and are separated by lightness instead. The
  binding consequence: a destructive action must **never** be signalled by colour alone
  (WCAG 1.4.1). The icon, the verb and the confirm step do the real work.

---

## Working on it

```bash
npm install
npm run check          # format · lint · tokens · types · build · tests + coverage ratchet
npm run docs:dev       # the docs site against the local build
```

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `build:tokens`      | snapshot → `tokens.css` + `tokens.ts`                     |
| `sync:tokens`       | `tokens.raw.json` → snapshot → build (**awaiting Figma**) |
| `check:figma-drift` | does the snapshot still match Figma? (**awaiting Figma**) |
| `build:catalog`     | sources → `docs/components.md`                            |
| `docs:manifest`     | sources + snapshot → the docs site's data                 |
| `build`             | tokens, then `tsup` (unbundled) + `tsc` declarations      |
| `docs:build`        | the full static export                                    |

Adding or changing a component: **read [`docs/component-authoring.md`](docs/component-authoring.md) first.**
The component list is [`docs/components.md`](docs/components.md), generated from the sources.

### What the build guarantees

- **`dist-directives.test.ts`** — every module that says `"use client"` in source still says it in
  `dist`, and no module that does not has acquired one. `bundle: false` in `tsup.config.ts` is one
  word in a file nobody reads twice, and flipping it would keep the build green while making the
  whole library a client reference. This is what notices.
- **the coverage ratchet** — set just under what the suite covers today (98.15 / 89.28 / 97 /
  98.15). Raise it as tests are added; never lower it to make CI green.
- **`git diff --exit-code` in CI** — the generated files cannot drift from their sources.

### No remote yet

`git init`, no `origin`. `.gitlab-ci.yml` builds every URL from `CI_PROJECT_ID` and
`CI_SERVER_HOST`, so it runs unchanged on whichever GitLab instance this ends up on. Until then:
`npm version` and `npm pack` locally, and consume through `file:`.
