// @vitest-environment node
// (jose needs Node's Uint8Array realm; jsdom's differs and breaks signing.)
//
// The security-critical core. Every case here is a way a token can be accepted that should not be,
// which is why they are stated as rejections rather than as happy paths.
import { describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

import { createJwt, DEFAULT_ACCESS_COOKIE, DEFAULT_REFRESH_COOKIE } from "./jwt";

const SECRET = "test-secret-test-secret-test-secret-32ch";
const jwt = createJwt({ secret: SECRET });
const ids = { jti: "jti-1", fam: "fam-1" };
const encoded = new TextEncoder().encode(SECRET);

describe("createJwt", () => {
  it("signs and verifies a valid access token", async () => {
    const token = await jwt.signAccess({ userId: "u1", role: "owner" });
    expect(await jwt.verifyToken(token)).toEqual({ userId: "u1", role: "owner" });
  });

  it("returns null for a missing or tampered token", async () => {
    expect(await jwt.verifyToken(undefined)).toBeNull();
    const token = await jwt.signAccess({ userId: "u1", role: "owner" });
    expect(await jwt.verifyToken(`${token}x`)).toBeNull();
  });

  it("refuses a token minted with a different secret", async () => {
    const other = createJwt({ secret: "other-secret-other-secret-other-32ch!" });
    const token = await other.signAccess({ userId: "u1", role: "owner" });
    expect(await jwt.verifyToken(token)).toBeNull();
  });

  it("refuses an access token presented as a refresh token, and the reverse", async () => {
    // Both types share a secret, so without the `typ` claim an access token could be replayed at
    // /auth/refresh to mint an endless supply of new sessions.
    const access = await jwt.signAccess({ userId: "u1", role: "owner" });
    const refresh = await jwt.signRefresh({ userId: "u1", role: "owner" }, ids);

    expect(await jwt.verifyToken(access, "refresh")).toBeNull();
    expect(await jwt.verifyToken(refresh, "access")).toBeNull();
    expect(await jwt.verifyRefresh(access)).toBeNull();
  });

  it("surfaces the rotation claims from a refresh token", async () => {
    const refresh = await jwt.signRefresh({ userId: "u1", role: "owner" }, ids);
    const claims = await jwt.verifyRefresh(refresh);

    expect(claims).toMatchObject({ userId: "u1", role: "owner", ...ids });
    expect(typeof claims?.exp).toBe("number");
  });

  it("treats an absent role as the empty string, and a non-string role as a forged token", async () => {
    // "" is a legitimate shape and matches no role set, so it stays deny-by-default. A numeric or
    // object role is a shape this signer never mints — refuse rather than guess, because the value
    // ends up in an outbound identity header.
    const noRole = await new SignJWT({ typ: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime("5m")
      .sign(encoded);
    expect(await jwt.verifyToken(noRole)).toEqual({ userId: "u1", role: "" });

    const objectRole = await new SignJWT({ typ: "access", role: { admin: true } })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime("5m")
      .sign(encoded);
    expect(await jwt.verifyToken(objectRole)).toBeNull();
  });

  it("refuses a token with no subject", async () => {
    const noSub = await new SignJWT({ typ: "access", role: "owner" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m")
      .sign(encoded);
    expect(await jwt.verifyToken(noSub)).toBeNull();
  });

  it("refuses an expired token", async () => {
    const expired = await new SignJWT({ typ: "access", role: "owner" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(encoded);
    expect(await jwt.verifyToken(expired)).toBeNull();
  });

  it("reads the secret lazily, so importing the module never touches configuration", () => {
    // The failure this exists for: reading the secret eagerly moves it to module-load time, and a
    // validated-env proxy then throws on a bare import in any environment that is not
    // server-shaped. Three route tests broke that way.
    const read = vi.fn(() => SECRET);
    createJwt({ secret: read });
    expect(read).not.toHaveBeenCalled();
  });

  it("uses the secret returned at call time, not at construction time", async () => {
    let current = SECRET;
    const rotating = createJwt({ secret: () => current });
    const before = await rotating.signAccess({ userId: "u1", role: "owner" });

    current = "rotated-secret-rotated-secret-32ch!!";
    expect(await rotating.verifyToken(before)).toBeNull();
  });

  it("takes its cookie names from the shared constants", () => {
    expect(DEFAULT_ACCESS_COOKIE).toBe("access_token");
    expect(DEFAULT_REFRESH_COOKIE).toBe("refresh_token");
  });

  it("honours custom TTLs", async () => {
    const short = createJwt({ secret: SECRET, accessTtlS: 1, refreshTtlS: 2 });
    expect(short.accessTtlS).toBe(1);
    expect(short.refreshTtlS).toBe(2);
  });
});
