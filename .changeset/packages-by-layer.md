---
"@digitaltwin/design-system": patch
---

No API change. The workspace now groups packages by layer on disk —
`packages/design-system/ui` rather than `packages/ui` — which moves the published tarball's source
paths. Recorded so the version reflects that anyone reading a stack trace or a source map sees the
new shape.
