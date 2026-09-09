// What is worth testing here is completeness and the fallback, not the translations themselves.
//
// The type system already refuses a locale that is missing a key. What it cannot catch is a key
// present but left in English, or a locale added to LOCALES with no messages behind it — both of
// which ship silently and are only visible to someone who reads that language.
import { describe, expect, it } from "vitest";

import { LOCALES } from "@digitaltwin/constants";

import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  messages,
  messagesFor,
  type DesignSystemMessages,
} from "./index";

/** Every leaf string in a messages object, as dotted paths. */
function paths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      paths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

describe("messages", () => {
  it("covers every locale the constants package declares", () => {
    // A locale added to LOCALES with no entry here would fall back to English forever, and the
    // only symptom is an app that looks translated until someone reads it.
    expect(Object.keys(messages).sort()).toEqual([...LOCALES].sort());
  });

  it("gives every locale the same keys", () => {
    const expected = paths(messages[DEFAULT_LOCALE]).sort();
    expect(expected.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      expect(paths(messages[locale]).sort(), `locale ${locale}`).toEqual(expected);
    }
  });

  it("has no empty string anywhere", () => {
    for (const locale of LOCALES) {
      const entries = paths(messages[locale]);
      for (const path of entries) {
        const value = path
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)[key],
            messages[locale],
          );
        expect(String(value).trim(), `${locale}.${path}`).not.toBe("");
      }
    }
  });

  it("actually translates — no locale is a copy of English", () => {
    // The failure this catches is a file created by copying en.ts and never finished.
    const english = JSON.stringify(messages[DEFAULT_LOCALE]);
    for (const locale of LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      expect(JSON.stringify(messages[locale]), `locale ${locale}`).not.toBe(english);
    }
  });
});

describe("isSupportedLocale", () => {
  it("accepts a shipped locale and rejects anything else", () => {
    expect(isSupportedLocale("vi")).toBe(true);
    expect(isSupportedLocale("de")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
  });
});

describe("messagesFor", () => {
  it("returns the requested locale", () => {
    expect(messagesFor("vi").pagination.next).toBe("Sau");
  });

  it("falls back to the default rather than throwing", () => {
    // Callers pass whatever came off a URL segment. Throwing there turns a typo in an address
    // bar into a 500.
    const fallback: DesignSystemMessages = messagesFor("de");
    expect(fallback).toBe(messages[DEFAULT_LOCALE]);
    expect(messagesFor(undefined)).toBe(messages[DEFAULT_LOCALE]);
  });
});
