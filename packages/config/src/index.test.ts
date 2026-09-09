// The schema fragments are the contract between an app's environment and the packages that read
// it, so what is worth testing is the boundary each one draws — not that zod works.
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { authEnv, backendEnv, digitaltwinEnv, siteEnv } from "./index";

const schema = z.object(digitaltwinEnv);

describe("authEnv", () => {
  it("rejects a secret short enough to brute force offline", () => {
    // The length IS the security property. HS256 with a short secret is attackable offline and
    // nothing at runtime would ever tell you.
    expect(z.object(authEnv).safeParse({ JWT_SECRET: "short" }).success).toBe(false);
  });

  it("accepts 32 characters", () => {
    const result = z.object(authEnv).safeParse({ JWT_SECRET: "a".repeat(32) });
    expect(result.success).toBe(true);
  });

  it("treats the single-instance acknowledgement as optional but not free-form", () => {
    const secret = "a".repeat(32);
    expect(
      z
        .object(authEnv)
        .safeParse({ JWT_SECRET: secret, ALLOW_IN_MEMORY_AUTH_STORE: "yes" }).success,
    ).toBe(false);
    expect(
      z
        .object(authEnv)
        .safeParse({ JWT_SECRET: secret, ALLOW_IN_MEMORY_AUTH_STORE: "true" }).success,
    ).toBe(true);
    expect(z.object(authEnv).safeParse({ JWT_SECRET: secret }).success).toBe(true);
  });
});

describe("backendEnv", () => {
  it("requires a URL, not a hostname", () => {
    expect(
      z.object(backendEnv).safeParse({ API_INTERNAL_URL: "backend:4000" }).success,
    ).toBe(false);
    expect(
      z.object(backendEnv).safeParse({ API_INTERNAL_URL: "http://backend:4000/api" })
        .success,
    ).toBe(true);
  });

  it("leaves the service token optional — absent means the backend authenticates the BFF another way", () => {
    expect(
      z.object(backendEnv).safeParse({ API_INTERNAL_URL: "http://backend:4000/api" })
        .success,
    ).toBe(true);
  });
});

describe("siteEnv", () => {
  it("defaults to localhost so a dev environment needs no configuration", () => {
    const parsed = z.object(siteEnv).parse({});
    expect(parsed.SITE_URL).toBe("http://localhost:3000");
  });
});

describe("digitaltwinEnv", () => {
  it("is the union of the fragments, with no key lost to a collision", () => {
    const keys = Object.keys(digitaltwinEnv).sort();
    const expected = [
      ...Object.keys(authEnv),
      ...Object.keys(backendEnv),
      ...Object.keys(siteEnv),
    ].sort();
    expect(keys).toEqual(expected);
    expect(new Set(expected).size).toBe(expected.length);
  });

  it("parses a complete environment", () => {
    const result = schema.safeParse({
      JWT_SECRET: "a".repeat(32),
      API_INTERNAL_URL: "http://backend:4000/api",
      SITE_URL: "https://app.example.com",
    });
    expect(result.success).toBe(true);
  });
});
