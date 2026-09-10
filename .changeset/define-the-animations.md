---
"@digitaltwin/design-system": minor
---

Define `animate-in`, `animate-out` and `animate-caret-blink`, which six components used and nothing
declared. The classes were inert — the components opened and closed correctly, with no transition
and no error anywhere, because a class matching no rule is a request for nothing.

They are `--animate-*` theme variables in `base.css`, driven by the existing motion tokens
(`--duration-fast`, `--ease-decelerate`, `--ease-accelerate`) rather than hardcoded timings, with a
`prefers-reduced-motion` block that removes the animation and leaves the state change.

`tw-animate-css` is deliberately not a dependency: what the components use is three animations and
no modifiers — no `fade-in-0`, no `zoom-in-95`, no `slide-in-from-top-2` — and that library's value
is the modifier system.

`InputOTPSlot` drops its `duration-1000` class, which never applied: in Tailwind v4 `duration-*`
sets transition-duration, not animation-duration. The animation owns its own duration now.
