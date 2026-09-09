// @digitaltwin/i18n — the strings the DESIGN SYSTEM itself puts on screen, translated.
//
// What this package is NOT: an app's copy. Nav labels, a sign-in screen, a product name — those
// belong to one app and stay there. Packaging them would mean the second app inherits the first
// app's words, which is worse than having no package at all.
//
// What it IS: the handful of strings a component renders when its consumer supplies nothing. The
// design system ships them as English DEFAULTS — `ThemeToggle`'s label, `Pagination`'s Previous
// and Next, `Spinner`'s aria-label — precisely so an app can replace them. Until now every app had
// to write those replacements itself, in four locales, from a list nobody maintained. That list is
// this file.
//
// Wiring it into next-intl stays in the app: the namespace registry and the request config are
// composition, and this package must not depend on next-intl to be useful to an app that does not
// use it.
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@digitaltwin/constants";

import { en } from "./messages/en.js";
import { es } from "./messages/es.js";
import { vi } from "./messages/vi.js";
import { zh } from "./messages/zh.js";

export { DEFAULT_LOCALE, LOCALES, type Locale };

/**
 * The shape every locale must satisfy, derived from the English one rather than hand-written.
 * A string added to `en` and forgotten elsewhere is a type error, not a runtime fallback.
 */
export type DesignSystemMessages = typeof en;

export const messages: Record<Locale, DesignSystemMessages> = { en, es, vi, zh };

/**
 * One type guard instead of an `as` cast repeated at every call site. Narrowing here means callers
 * never need a non-null assertion, so a future refactor cannot quietly break the check.
 */
export function isSupportedLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

/** Messages for a locale, falling back to the default rather than throwing on an unknown one. */
export function messagesFor(locale: string | undefined): DesignSystemMessages {
  return isSupportedLocale(locale) ? messages[locale] : messages[DEFAULT_LOCALE];
}
