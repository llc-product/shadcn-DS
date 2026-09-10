# @digitaltwin packages

Two sets of packages that share a toolchain and a release pipeline, and **nothing else**. Say that
out loud, because the repository is easy to mistake for one thing:

```
packages/
  ── the design system ──────────────────────────────────────────────────────────────────────────
  ui/            @digitaltwin/design-system — 56 React primitives on the token layer
  utils/         cn + formatting that states its locale instead of reading the machine's
  i18n/          the design system's OWN default strings, translated. Not an app's copy.
  ── the platform libraries ─────────────────────────────────────────────────────────────────────
  api/           one API client instance, browser and server, on a backend-owned session
  auth/          the session type + its error (edge-safe) · ./next holds the cookie plumbing
  config/        environment SCHEMA fragments (no createEnv: that is the app's call)
  constants/     the session cookie — values where a MISMATCH between repos is a bug
  types/         Paginated<T> · ActionResult<T> — the contracts more than one app agrees on
  ── toolchain, wanted by both ──────────────────────────────────────────────────────────────────
  tsconfig/      base · react-library · next
  eslint-config/ base · node · react · design-system · boundaries
  testing/       the jsdom stubs and the vitest config factory
apps/docs/       the docs site (Next.js static export) — and the library's first real consumer
scripts/         the token pipeline, the catalog generators, and the publish guards
docs/            component-authoring.md (the standard) · components.md (generated)
```

The design system is 4,100 of the ~5,000 lines here. The rest is what an app's BFF needs, and the
two halves **do not import each other in either direction** — not once, today.

## Why one repository

Because the only thing they genuinely share is the toolchain, and splitting would mean duplicating
`tsconfig`, `eslint-config` and the graph/publish guards, or linking them across repositories.
That trades one seam for three, in exactly the files most likely to drift apart.

And because no coupling means the split stays cheap. There is nothing to unpick — the day these
halves want different release cadences, moving six small packages is an afternoon. Waiting costs
nothing, so this is a decision to keep making rather than one to make now.

**`npm run check:graph` is what keeps it true.** The separation was a fact, not a rule, and a fact
is one convenient import away from ending. The check now fails on a dependency crossing between the
halves, so "cheap to split later" stays a property of the repository instead of a claim in a
README. Toolchain packages are exempt: both halves may use them, which is the whole reason they
are here.

**Why the small ones are separate packages.** Because there is more than one consumer, and a
package boundary is the only thing a second repository can import. The alternative — one
`@digitaltwin/core` holding types, constants and utils — was rejected on the architecture's own
rule: every folder is named for what it holds, and a bucket has no criterion for refusing anything.

---

## The design system

React 19 primitives on Tailwind v4 design tokens. 56 components, one token layer, one contrast
gate that fails the build rather than a review.

This is the React counterpart to [`libs/design-system`](https://gitlab.nailjob.us:8081/libs/design-system)
(Quasar/Vue). The two share a brand and a way of working, not a component kit.

**Root entries are deliberately narrow.** `@digitaltwin/auth` exports only what runs anywhere; the
Next adapter is reachable solely through `@digitaltwin/auth/next`. `npm run check:graph` walks what
each root entry actually reaches and fails if server code is one of them, because an `exports` map
is a promise a one-line edit can break with every test still green.

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

38 of the 56 modules carry `"use client"`; the other 18 — `Button`, `ButtonGroup`, `Card`,
`Badge`, `Table`, `Alert`, `Breadcrumb`, `Pagination`, `Input`, `InputGroup`, `Textarea`,
`NativeSelect`, `Field`, `Item`, `Empty`, `Kbd`, `Skeleton`, `Spinner` — render in a
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
| `changeset`         | describe a change; one file per change, same commit       |
| `version-packages`  | apply pending changesets: bump versions, write CHANGELOGs |
| `release`           | build, then publish whatever the registry does not have   |

Adding or changing a component: **read [`docs/component-authoring.md`](docs/component-authoring.md) first.**
The component list is [`docs/components.md`](docs/components.md), generated from the sources.

### What the build guarantees

- **`dist-directives.test.ts`** — every module that says `"use client"` in source still says it in
  `dist`, and no module that does not has acquired one. `bundle: false` in `tsup.config.ts` is one
  word in a file nobody reads twice, and flipping it would keep the build green while making the
  whole library a client reference. This is what notices.
- **a coverage ratchet per package**, set just under what that package's suite actually covers, not
  to an aspiration. `packages/ui` sits at 97 / 89 / 97 / 97 against a suite measuring ~98; the six
  smaller packages are at 95 / 90 / 95 / 95 and most of them measure 100. Raise them as tests are
  added; the one thing never to do is lower one to make CI green, which converts the only automatic
  signal about test decay into a number someone edits whenever it complains.
- **`git diff --exit-code` in CI** — the generated files cannot drift from their sources.

### Releasing

Releases are driven by [changesets](.changeset/README.md), not by a version tag.

```bash
npx changeset            # while making the change: what changed, which packages, which bump
npx changeset version    # on the release branch: bump versions, write CHANGELOGs
```

CI publishes from the default branch. `changeset publish` compares each manifest against the
registry and ships only what is missing, so the job is a no-op until a version commit lands, and
`scripts/assert-publishable.mjs` refuses the whole run if any workspace package is unscoped,
unversioned, or not marked `restricted`.

A tag-and-version-match guard would not survive more than one package: most releases here are a
fan-out, where bumping one package republishes everything that depends on it in the same breath.

### The remote

`origin` is GitHub today. `.gitlab-ci.yml` builds every URL from `CI_PROJECT_ID` and
`CI_SERVER_HOST`, so it runs unchanged on whichever GitLab instance this ends up on — but it does
not run on GitHub at all, so nothing publishes until the remote moves. Until then: `npm pack`
locally and consume through `file:`.
