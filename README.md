# companion-module-zerodensity-realityhub

Bitfocus Companion module for controlling **Zero Density RealityHub 2.1** for virtual production and broadcast graphics control.

## Features

- **Rundown Playback Control** - Play, Out, Continue items to Program/Preview channels
- **Launch Control** - Start/Stop shows with safety confirmation
- **Real-time Status Feedback** - Visual indicators for on-air items
- **Node Property Control** - Direct Nodos node parameter manipulation
- **Template Automation** - Template pool management and triggers
- **Auto-generated Presets** - Buttons created automatically from your rundowns

## Requirements

- RealityHub 2.1 with REST API licensed and enabled
- REST API key with Lino, Launcher, and Nodegraph Editor permissions
- Bitfocus Companion 3.x

## Installation

Import this module through Companion's built-in module interface, or download a release package and use "Import module package".

## Development

Install dependencies:

```bash
yarn install --frozen-lockfile
```

Common commands:

```bash
yarn test
yarn package
```

## CI/CD and Versioning

- CI runs in GitHub Actions using:
  - `.github/workflows/companion-module-checks.yaml` (Bitfocus module checks)
  - `.github/workflows/node.yaml` (test, package)
- `yarn lint` is available locally for incremental cleanup.
- Releases are tag-driven via `.github/workflows/release.yaml`.
- Version source of truth is `package.json`.
- Tag releases using `vX.Y.Z` (example: `v2.1.24`).

Release from `main` with:

```bash
git checkout main
git pull origin main
git tag v2.1.24
git push origin v2.1.24
```

## Documentation

See [companion/HELP.md](companion/HELP.md) for full configuration and usage documentation.
Maintainer process and release rules are documented in [MAINTAINERS.md](MAINTAINERS.md).

## License

MIT - See [LICENSE](LICENSE)
