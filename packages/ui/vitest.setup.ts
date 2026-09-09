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

// Embla (Carousel) observes its slides to decide what is in view. jsdom has no viewport, so the
// stub never reports an intersection — which is why the carousel tests assert the disabled
// arrows rather than a scroll position.
globalThis.IntersectionObserver ??= class {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as unknown as typeof IntersectionObserver;

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
// input-otp positions its caret by asking what sits under the pointer. jsdom has no hit testing,
// so the real call throws asynchronously — the tests still pass and the run still fails.
if (typeof document !== "undefined") {
  document.elementFromPoint ??= () => null;
}

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
