---
"@digitaltwin/i18n": minor
"@digitaltwin/constants": major
---

Move `LOCALES`, `DEFAULT_LOCALE` and `Locale` from `@digitaltwin/constants` into
`@digitaltwin/i18n`, which was their only consumer and already re-exported all three. Importing
them from `@digitaltwin/constants` is a breaking change; import them from `@digitaltwin/i18n`.

The list and the `messages` map have to agree — a locale in one and not the other is either a
missing translation or a dead entry — and a contract can only be enforced where both halves of it
live. One package away, "the apps ship these locales" and "this package translates these locales"
were two facts that happened to match.

`@digitaltwin/constants` now holds only the session vocabulary, and `@digitaltwin/i18n` no longer
depends on it.
