---
"@digitaltwin/design-system": minor
"@digitaltwin/utils": major
---

`cn` moves out of `@digitaltwin/utils` and into `@digitaltwin/design-system`, which is the only
package that was ever going to call it. Importing `cn` from `@digitaltwin/utils` is a breaking
change; import it from `@digitaltwin/design-system`, where it has been exported all along.

Merging Tailwind classes is a design-system concern: it exists because every component takes
`className` and has to let a caller's class beat the variant's, and `tailwind-merge` is a
dependency nothing outside a Tailwind component library wants. `@digitaltwin/utils` keeps the
general helpers — number formatting that states its locale rather than reading the machine's — and
moves to the platform half, where a general helper belongs.

`ChartTooltipContent` formats its own values now rather than reaching for `formatNumber` across
that boundary. It passed no locale and no options, so the general helper's guards against
malformed tags were unreachable from it; what replaces the call is the whole of what the call did.
