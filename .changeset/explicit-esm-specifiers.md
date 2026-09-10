---
"@digitaltwin/design-system": patch
---

Give every relative import in the package an explicit `.js` extension, so the built package is
valid ESM.

`dist/index.js` opened with `export * from "./components"` — a directory import, which Node's ESM
resolver refuses outright. `import("@digitaltwin/design-system")` failed with `Directory import ...
is not supported`. Bundlers resolve it anyway, which is why the docs site and every test passed
while the package was unusable from plain Node.

The other packages in this workspace already wrote `./client.js`, `./session.js` and so on. This
one was the exception.
