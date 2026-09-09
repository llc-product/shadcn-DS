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

### Known gaps

- Figma has no variable collection for the React DS, so `tokens.export.json` is hand-seeded.
  `sync-tokens.mjs` and `check-figma-drift.mjs` are written and wait for it.
- No git remote, so nothing is published yet. Consume through `file:`.
