// @vitest-environment node
//
// The session helpers: the layer that turns a cookie into an identity, and the one that had no
// tests at all. Every case here is a way the wrong answer becomes a session someone should not
// have, or a redirect that never happens.
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { UnauthorizedError, createSessionHelpers } from "./next";
import type { Session, TokenType } from "./jwt";

const session = { userId: "u1", role: "owner" };

/** A NextResponse is only used here for `.cookies.set`, so that is all the double provides. */
const fakeResponse = () => {
  const set = vi.fn();
  return { res: { cookies: { set } } as never, set };
};

const verifyToken = vi.fn<(t: string | undefined, e?: TokenType) => Promise<Session>>();
const onUnauthenticatedPage = vi.fn();

const helpers = (overrides: Record<string, unknown> = {}) =>
  createSessionHelpers({
    verifyToken,
    cookieNames: { access: "access_token", refresh: "refresh_token" },
    ttlS: { access: 900, refresh: 604800 },
    onUnauthenticatedPage: onUnauthenticatedPage as never,
    ...overrides,
  });

beforeEach(() => {
  cookieStore.get.mockReset().mockReturnValue({ value: "a-token" });
  verifyToken.mockReset().mockResolvedValue(session);
  onUnauthenticatedPage.mockReset();
});

describe("getSession", () => {
  it("verifies the ACCESS cookie, and says so explicitly", async () => {
    // The `typ` claim exists so a refresh token cannot be replayed as an access token. Leaving
    // the type to a default puts that guarantee inside a function this module does not own — and
    // both cookies are set on the same path, so accepting the wrong one turns a 15-minute session
    // into a 7-day one.
    await expect(helpers().getSession()).resolves.toEqual(session);

    expect(cookieStore.get).toHaveBeenCalledWith("access_token");
    expect(verifyToken).toHaveBeenCalledWith("a-token", "access");
  });

  it("returns null when the cookie is absent", async () => {
    cookieStore.get.mockReturnValue(undefined);
    verifyToken.mockResolvedValue(null);

    await expect(helpers().getSession()).resolves.toBeNull();
    expect(verifyToken).toHaveBeenCalledWith(undefined, "access");
  });

  it("returns null when the token does not verify — deny by default", async () => {
    verifyToken.mockResolvedValue(null);
    await expect(helpers().getSession()).resolves.toBeNull();
  });
});

describe("requireSession", () => {
  it("returns the session when there is one, without redirecting", async () => {
    await expect(helpers().requireSession()).resolves.toEqual(session);
    expect(onUnauthenticatedPage).not.toHaveBeenCalled();
  });

  it("hands control to the app's redirect when there is none", async () => {
    verifyToken.mockResolvedValue(null);
    // The app calls Next's redirect() itself, which throws; the double stands in for that.
    onUnauthenticatedPage.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(helpers().requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(onUnauthenticatedPage).toHaveBeenCalledTimes(1);
  });

  it("still refuses to return a null session if the redirect does NOT throw", async () => {
    // A hook that forgets to throw would otherwise let the caller carry on with `null` as a
    // session — every downstream authorization check would then evaluate it.
    verifyToken.mockResolvedValue(null);
    onUnauthenticatedPage.mockResolvedValue(undefined);

    await expect(helpers().requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("assertSession", () => {
  it("returns the session when there is one", async () => {
    await expect(helpers().assertSession()).resolves.toEqual(session);
  });

  it("THROWS rather than redirecting, so a route handler can answer 401", async () => {
    // A redirect from a handler answers 307; a fetch client follows it and receives HTML, so the
    // 401 that drives refresh-and-retry never reaches the client.
    verifyToken.mockResolvedValue(null);

    await expect(helpers().assertSession()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(onUnauthenticatedPage).not.toHaveBeenCalled();
  });
});

describe("setAuthCookies", () => {
  it("writes both cookies with their own lifetimes", () => {
    const { res, set } = fakeResponse();
    helpers().setAuthCookies(res, { access: "A", refresh: "R" });

    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith(
      "access_token",
      "A",
      expect.objectContaining({ maxAge: 900 }),
    );
    expect(set).toHaveBeenCalledWith(
      "refresh_token",
      "R",
      expect.objectContaining({ maxAge: 604800 }),
    );
  });

  it("makes both HttpOnly, lax and path-wide", () => {
    // HttpOnly is what makes this a cookie-only model: XSS cannot read a token it cannot see.
    // path "/" is what lets the edge proxy read it as well as every route.
    const { res, set } = fakeResponse();
    helpers({ isSecure: () => true }).setAuthCookies(res, { access: "A", refresh: "R" });

    for (const call of set.mock.calls) {
      expect(call[2]).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      });
    }
  });

  it("leaves the cookies readable over plain HTTP outside production", () => {
    // `secure` on localhost means the browser silently drops the cookie and sign-in appears to
    // do nothing at all.
    const { res, set } = fakeResponse();
    helpers({ isSecure: () => false }).setAuthCookies(res, { access: "A", refresh: "R" });

    expect(set.mock.calls[0]![2]).toMatchObject({ secure: false });
  });
});

describe("clearAuthCookies", () => {
  it("expires both cookies with the SAME attributes it set them with", () => {
    // A browser only drops a cookie when the expiring Set-Cookie matches on name, path and the
    // rest. Clearing with different attributes leaves the original in place, and the user stays
    // signed in after pressing sign out.
    const { res, set } = fakeResponse();
    helpers({ isSecure: () => true }).clearAuthCookies(res);

    expect(set).toHaveBeenCalledTimes(2);
    for (const call of set.mock.calls) {
      expect(call[1]).toBe("");
      expect(call[2]).toMatchObject({
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      });
    }
    expect(set.mock.calls.map((c) => c[0])).toEqual(["access_token", "refresh_token"]);
  });
});

describe("isSecure", () => {
  it("defaults to production-only, so localhost still works", () => {
    const { res, set } = fakeResponse();
    vi.stubEnv("NODE_ENV", "development");
    helpers().setAuthCookies(res, { access: "A", refresh: "R" });
    expect(set.mock.calls[0]![2]).toMatchObject({ secure: false });

    set.mockClear();
    vi.stubEnv("NODE_ENV", "production");
    helpers().setAuthCookies(res, { access: "A", refresh: "R" });
    expect(set.mock.calls[0]![2]).toMatchObject({ secure: true });

    vi.unstubAllEnvs();
  });
});
