# Changesets

This folder is how a change becomes a release. One file per user-visible change, written by the
person who made it, in the same commit.

```bash
npx changeset            # describe the change, pick the packages and the bump
npx changeset version    # apply every pending changeset: bump versions, write CHANGELOGs
npx changeset publish   # CI does this on the default branch; see .gitlab-ci.yml
```

## Why this and not a tag

The previous release path published exactly one package and asserted that the git tag matched the
version in its manifest. That works for one package and stops working the moment there are several,
because most releases here are not one package moving on its own:

- a package's dependents must be republished with it — `changeset version` works that out from the
  manifests, so listing the changed package is enough
  with a bumped range, or consumers get a version pair that was never tested together.
- `@digitaltwin/constants` changes → `auth`, `api` and `i18n` all depend on it and all move.

Internal ranges are real semver (`^0.1.0`), never `*`. `*` resolves against the workspace locally
and looks fine forever, then publishes verbatim — telling consumers any version will do, and giving
changesets nothing to bump. `scripts/assert-publishable.mjs` refuses a release that contains one.

`updateInternalDependencies: "patch"` is what handles that: when a package bumps, everything in the
workspace that depends on it gets its range updated and a patch bump of its own.

## Conventions

- **A changeset per change, not per release.** Written while the reason is still fresh.
- **Describe the effect on a consumer**, not the diff. "Tooltip values no longer follow the host
  locale" beats "changed chart.tsx".
- **`major` needs a migration note** in the changeset body. Breaking one package now breaks every
  app that installs it.
- **No changeset needed** for docs, tests, CI, or anything that does not ship in a package. CI does
  not fail on a missing changeset — it is a judgement call, not a gate.
