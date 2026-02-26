# Maintainer Rules and Release Process

This document defines the default workflow for maintaining this Companion module.

## 1) Branching strategy

- Use `main` as the single integration branch.
- Do **not** keep a permanent branch for every patch version (`2.1.21`, `2.1.22`, ...).
- Create short-lived branches per change:
  - `feat/<topic>` for features
  - `fix/<topic>` for bug fixes
  - `chore/<topic>` for tooling/docs/CI
- Merge via Pull Request only (no direct pushes to `main`).

## 2) Versioning rules

- Follow SemVer:
  - `PATCH` for bug fixes/internal improvements
  - `MINOR` for backward-compatible features
  - `MAJOR` for breaking changes
- Keep version in sync in both files:
  - `package.json`
  - `companion/manifest.json`
- Release tags must be `vX.Y.Z` (for example: `v2.1.21`).

## 3) CI and release flow

- Every PR must pass:
  - module checks
  - tests (`yarn test`)
  - build (`yarn build`)
- Merging to `main` triggers release automation:
  - build artifact (`*.tgz`)
  - GitHub Release creation
  - auto-generated release notes
- Release source of truth is the version in `package.json`.

## 4) Testing policy

- New behavior changes require tests when practical.
- Minimum local verification before opening PR:
  - `yarn test`
  - `yarn build`
- Keep tests deterministic and fast (avoid network-dependent tests in CI by default).

## 5) Compatibility and upgrades

- If config/action/feedback structure changes, add/update `upgradeScripts` in `upgrades.js`.
- Preserve existing user workflows whenever possible.
- Call out any behavior change in PR description and release notes.

## 6) When to use maintenance branches

Use long-lived maintenance branches only when supporting parallel release lines, for example:

- `main` for upcoming `2.2.x`
- `release/2.1` for critical backports to `2.1.x`

If this is not needed, stay with trunk-based flow on `main`.

## 7) GitHub repository rules (recommended settings)

Configure branch protection on `main`:

- Require pull request before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Restrict direct pushes to `main`
- Include administrators in protections

Optional but useful:

- Auto-delete head branches after merge
- Squash merge as default merge strategy
- Linear history enabled

## 8) Standard release checklist

1. Create branch from latest `main`
2. Implement change + tests
3. Bump version in `package.json` and `companion/manifest.json`
4. Run `yarn test` and `yarn build`
5. Open PR and merge after checks pass
6. Confirm GitHub Release and artifact were created
