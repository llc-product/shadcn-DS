import "@testing-library/jest-dom/vitest";

// jsdom implements no layout engine, and Radix's floating/measuring primitives call these
// unconditionally. Without the stubs the components throw before rendering anything, so the
// tests would be asserting on the absence of a crash rather than on behaviour.
//
// These are stubs, not simulations: they make the components mount, and nothing here should ever
// be used to assert a position or a size. Anything that depends on real layout belongs in a
// browser test, not in this suite.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

globalThis.DOMRect ??= class {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {}
  top = 0;
  right = 0;
  bottom = 0;
  left = 0;
  static fromRect() {
    return new DOMRect();
  }
  toJSON() {
    return {};
  }
} as unknown as typeof DOMRect;

// Guarded: this same setup file also loads for the `@vitest-environment node` suites (the
// contrast gate, the dist-directives check), where there is no DOM and Element is undefined.
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof matchMedia;
