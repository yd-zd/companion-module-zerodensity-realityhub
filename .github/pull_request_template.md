## What changed

<!-- Describe the change and why it is needed -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Docs/CI/chore

## Maintainer checklist

- [ ] Branch is short-lived and targets `main`
- [ ] No direct commits to `main`
- [ ] `package.json` and `companion/manifest.json` versions are synced (if release-related)
- [ ] `upgradeScripts` updated in `upgrades.js` if config/action/feedback schema changed
- [ ] `yarn test` passes
- [ ] `yarn build` passes
- [ ] Any user-facing behavior change is documented in PR notes

## Release impact

- [ ] Patch (`x.y.Z`)
- [ ] Minor (`x.Y.z`)
- [ ] Major (`X.y.z`)
- [ ] No version change needed
