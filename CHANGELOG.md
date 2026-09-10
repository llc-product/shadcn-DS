# Changelog

## 0.1.0 — unreleased

First cut. The design system moves out of `nextjs-boilerplate/src/components/ui` and becomes a
versioned package.

### Added

- **35 components** in `packages/ui`, one folder each, with a test per component (161 tests,
  98.15% statements).
- **A token pipeline**: `tokens.export.json` → `tokens.css` (custom properties + `@theme inline`)
  and `tokens.ts`. Generated and committed; CI fails on a stale diff.
- **A contrast gate** that parses the generated stylesheet and asserts every WCAG-obligated pair,
  in both themes.
- **`--primary-strong`** — the brand at a strength that survives being text.
- **A build guarantee**: `dist-directives.test.ts` proves the `"use client"` boundaries survive
  the build, per module.
- **A docs site** (`apps/docs`, Next.js static export) that is also the package's first real
  consumer, plus a generated `docs/components.md`.
- **`docs/component-authoring.md`** — the standard for adding a component.

### Fixed — carried over from the boilerplate

- **`Progress` announced nothing.** `value` was destructured and never forwarded to the Radix
  root, so the bar rendered at the correct width and stayed permanently "indeterminate" to a
  screen reader. Visually invisible, which is why it survived.
- **`Slider` could not be a range.** It rendered exactly one thumb, hardcoded, so
  `defaultValue={[20, 80]}` came out with a single handle and no error.
- **`--muted-foreground` on `--muted` measured 4.339:1**, below AA — the exact pair `TabsList`
  renders and `Toggle` uses on hover. neutral/500 darkened 0.556 → 0.54.
- **The `link` button variant used `--primary` as text**, measuring 3.164:1 on a light ground.
  It now uses `--primary-strong`.
- **Untranslatable English.** `ThemeToggle` hardcoded its `aria-label`; `PaginationPrevious` /
  `PaginationNext` rendered "Previous" / "Next" through a path a caller could not reach. All
  user-visible strings are now defaults a consuming app can replace.

- **`ChartTooltipContent` formatted numbers against the host's locale.** It called
  `value.toLocaleString()` with no locale, so the same value rendered "1,234" on an en-US machine
  and "1.234" on a vi-VN one — a hydration mismatch between a server render and the browser, and a
  test that passed or failed depending on who ran it. The default is now pinned, and a new
  `valueFormatter` prop is how a consumer localises deliberately.

### Fixed — the repo on Windows

- **Three things broke at once on a Windows checkout**, all from CRLF. `scripts/lib/catalog.mjs`
  parses `components/index.ts` with `$`-anchored patterns, which do not match before a `\r`, so the
  barrel read as empty and `build:catalog` reported all 56 folders as missing from the file that
  lists them. Prettier's `endOfLine` default is `lf`, so `format:check` failed on every file. Fixed
  at both ends on purpose: `.gitattributes` pins LF in the working tree, and the script normalises
  what it reads — neither should have to trust the other.

### Added — the 21 shadcn primitives the kit was missing

Ported from `nextjs-boilerplate`'s `src/components/ui`, each into its own folder with a test,
under the same standard as the original 35. **56 components, 311 tests, 98.01% statements.**

- **Layout / containers** — `AspectRatio`, `Collapsible`, `Resizable`, `Carousel`, `Item`
- **Forms** — `Field`, `InputGroup`, `NativeSelect`, `InputOTP`, `Calendar`, `DatePicker`,
  `Combobox`
- **Overlays** — `ContextMenu`, `Menubar`, `NavigationMenu`, `Command`, `Drawer`
- **Primitives** — `Kbd`, `ButtonGroup`
- **Feedback** — `Empty`
- **Data display** — `Chart`

`--chart-1` … `--chart-5` join the token pipeline as semantic colours with their own Light/Dark
primitives — re-hued per theme, not re-lightened, because the light series loses separation on a
dark ground. They carry no `CONTRAST_PAIRS` entry: a series fill is not text and has no partner
token to be read against.

Heavy, feature-specific runtimes (`recharts`, `vaul`, `cmdk`, `embla-carousel-react`,
`react-day-picker`, `react-resizable-panels`, `input-otp`) are **optional peer dependencies**, so
an app that never renders a `Chart` does not pay for recharts. The five new Radix packages are
ordinary dependencies, as the other twenty-one already were.

### Fixed — while porting

- **`CarouselPrevious` / `CarouselNext` hardcoded their screen-reader labels.** "Previous slide"
  and "Next slide" were JSX children, which always beat `props.children` — so no consuming app
  could reach them. Both now take a `label` prop with that default, and children replace the arrow
  outright. Same defect the `Pagination` pair had.
- **`DatePicker` opened on today, not on its own value.** react-day-picker does not derive the
  displayed month from `selected`, so a picker holding a date in March opened on the current month
  and the user had to navigate back to their own answer.
- **`DatePicker` imported `next-intl`.** A primitive may not decide a locale — the package is
  lint-blocked from framework imports for exactly this reason. It now takes a `locale` prop.
- **`docs:manifest` never ran Prettier**, unlike the other two generators, so the committed
  `apps/docs/src/data/components.json` failed `format:check` — the first step of CI.

### Changed

- The coverage ratchet moves up with the suite: **97 / 97 / 89 / 97** (was 97 / 95 / 88 / 97).
- `vitest.setup.ts` gains two jsdom stubs: `IntersectionObserver` (Embla observes slides to decide
  what is in view) and `document.elementFromPoint` (input-otp hit-tests to place its caret — the
  real call threw asynchronously, which passed every test and failed the run).

### Known gaps

- Figma has no variable collection for the React DS, so `tokens.export.json` is hand-seeded.
  `sync-tokens.mjs` and `check-figma-drift.mjs` are written and wait for it.
- ~~`animate-in`, `animate-out` and `animate-caret-blink` are not defined anywhere.~~ **Fixed.**
  They are declared in `base.css` as `--animate-*` theme variables driven by the motion tokens,
  and `animations.test.ts` now refuses an `animate-*` class that is neither a Tailwind built-in
  nor declared there. `tw-animate-css` is still not a dependency: what the components actually use
  is three animations and no modifiers, and that library's value is the modifier system.
- No git remote, so nothing is published yet. Consume through `file:`.
