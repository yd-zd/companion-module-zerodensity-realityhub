# MAINTAINERS

This fork follows the Bitfocus Companion module workflow and quality gates.

## Maintainers

| Name | GitHub | Email | Role |
| --- | --- | --- | --- |
| Yunus Dede | [@yd-zd](https://github.com/yd-zd) | yunusdede@outlook.com | Primary maintainer (fork owner) |
| Jan Gorgen | N/A | jg@goergen-medien.de | Original module maintainer |

## Supported Branch Model

- `main` is the only long-lived branch.
- Use short-lived topic branches:
  - `feat/<topic>`
  - `fix/<topic>`
  - `chore/<topic>`
- Merge via pull requests only.

## Required Checks Before Merge

- `Companion Module Checks` workflow passes.
- `Node CI` workflow passes:
  - `yarn test`
  - `yarn package`
- `yarn lint` is recommended locally and should be improved gradually.

## Versioning Policy

- SemVer is required:
  - `PATCH`: fixes/tooling/docs with no behavior break
  - `MINOR`: backward-compatible new features
  - `MAJOR`: breaking changes
- `package.json` is the release version source of truth.
- `companion/manifest.json` stays at `0.0.0` and is handled at package build time.
- Git tags must use `vX.Y.Z`.

## Release Procedure

1. Update code and tests on a topic branch.
2. Run local gates:
   - `yarn test`
   - `yarn package`
3. Bump version in `package.json`.
4. Merge pull request to `main`.
5. Create and push tag `vX.Y.Z`:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
6. GitHub Actions `Release` workflow builds `.tgz` and publishes the GitHub Release.

## Upgrade Script Policy

- If config/action/feedback IDs or structures change, update `upgrades.js`.
- Keep existing user configurations compatible whenever possible.
