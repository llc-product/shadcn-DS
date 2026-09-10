// A stand-in for the `server-only` package under Vitest.
//
// The real module exists to THROW when it is pulled into a client bundle, and it decides that from
// the export condition the bundler picks. Vitest picks the one that throws, so importing the Next
// adapter at all would fail before a single assertion ran. Aliasing it here removes the guard from
// the test run only; what actually enforces it in a build is `scripts/check-package-graph.mjs`,
// which asserts no root entry can reach this module in the first place.
export {};
