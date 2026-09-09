import { describe, expect, it, vi } from "vitest";

import { createSingleFlight } from "./single-flight";

const defer = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("createSingleFlight", () => {
  it("runs once for callers that overlap", async () => {
    const gate = defer<string>();
    const run = vi.fn(() => gate.promise);
    const invoke = createSingleFlight(run);

    const all = Promise.all([invoke(), invoke(), invoke()]);
    gate.resolve("ok");

    expect(await all).toEqual(["ok", "ok", "ok"]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("is not a cache — the next call after it settles starts a fresh run", async () => {
    const run = vi.fn(async () => "ok");
    const invoke = createSingleFlight(run);

    await invoke();
    await invoke();

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("clears the flight after a rejection, so a failure is retryable", async () => {
    // Without the `finally`, one failed refresh would wedge every later attempt on a rejected
    // promise and log the user out for the lifetime of the tab.
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");
    const invoke = createSingleFlight(run);

    await expect(invoke()).rejects.toThrow("boom");
    await expect(invoke()).resolves.toBe("ok");
  });

  it("runs with the arguments of the caller that STARTED the flight", async () => {
    // Closing over the arguments instead would pin the first caller's forever — for the refresh
    // flow that means every later attempt carries an abort signal collected long ago.
    const gate = defer<string>();
    const run = vi.fn((_label: string) => gate.promise);
    const invoke = createSingleFlight(run);

    const all = Promise.all([invoke("first"), invoke("second")]);
    gate.resolve("ok");
    await all;

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith("first");
  });

  it("uses the NEW caller's arguments once the previous flight has settled", async () => {
    const run = vi.fn(async (label: string) => label);
    const invoke = createSingleFlight(run);

    expect(await invoke("first")).toBe("first");
    expect(await invoke("second")).toBe("second");
  });
});
