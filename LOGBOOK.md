# RealityHub Companion Module - Development Logbook

## 2025-12-29: Version 2.1.2 - Lino Rundown Controls and Show Status Fixes

### Major Features Added

#### 1. Lino Rundown Item Playback Controls
Added comprehensive playback control actions for rundown items:
- **Play Item** - Play rundown item to Program (PGM) or Preview (PVW)
- **Out Item** - Take out rundown item from Program or Preview
- **Continue Item** - Continue animation of item on Program or Preview
- **Play Next** - Play next item in rundown to Program or Preview

All actions support channel selection (0 = Program, 1 = Preview) matching RealityHub's dual-channel architecture.

**API Endpoints Used:**
- `PUT /lino/rundown/{showId}/play/{itemId}/{preview}`
- `PUT /lino/rundown/{showId}/out/{itemId}/{preview}`
- `PUT /lino/rundown/{showId}/continue/{itemId}/{preview}`
- `PUT /lino/rundown/{showId}/playnext/{preview}`

**New Presets:**
- Created `Lino Playback: {rundown}` category with presets for each item
- Color-coded buttons: Green for Preview, Red for Program, Yellow for Continue
- Includes "Play Next" buttons for quick rundown navigation

### Critical Fixes

#### 2. Show Status Detection Consistency
**Problem:** The `/launcher` API returns `running` property while `/lino/engines` returns `started` property. These can be inconsistent, causing rundowns to not load or button triggers to fail.

**Solution:** Updated all Show status checks to use `show.running || show.started` throughout the codebase:
- `features/engines.js` - Show selection and rundownToShowMap building
- `features/rundowns.js` - Rundown filtering and loading
- `actions.js` - Button trigger validation
- `variables.js` - Show status variables
- `presets.js` - Preset category indicators

#### 3. Rundown-to-Show Mapping
**Problem:** The RealityHub API has confusing naming - Lino "engines" are actually "Shows", and `GET /lino/rundowns/{engineId}` returns ALL rundowns regardless of the engineId parameter.

**Solution:** 
- Built `rundownToShowMap` using `loadedRundownsInfo` from each Show
- Filter rundowns to only show those actually loaded on running Shows
- Use correct Show ID (not Reality Engine ID) for all Lino API calls

**Key Architecture Understanding:**
- **Reality Engines** (`/api/rest/v1/engines`) - Physical render machines (IDs: 41, 42, 44...)
- **Shows** (`/api/rest/v1/launcher`) - Logical groupings controlling engines (IDs: 60, 92, 96...)
- **Lino "Engines"** (`/api/rest/v1/lino/engines`) - **SAME AS SHOWS** (legacy naming confusion)
- All Lino API `{engineId}` parameters are actually **Show IDs**

#### 4. Data Structure Initialization
Added proper initialization of new data structures in `index.js`:
- `shows` - Rich Show data from `/launcher` API
- `linoEngines` - Backward compatibility (same as shows)
- `rundownToShowMap` - Maps rundownId → showId for button triggers
- `primaryShowId` - First running Show ID
- `linoEngineId` - Backward compatibility

#### 5. Safety Improvements
- Added null safety checks for `config.features` and `config.interval`
- Improved error handling in `configUpdated()` method
- Added null checks for `inst.data.engines` in `features/nodes.js`

### Files Changed
- `features/engines.js` - Show status checks, rundownToShowMap building
- `features/rundowns.js` - Rundown filtering, item selection options
- `actions.js` - New playback control actions, Show status validation
- `variables.js` - Show status variables with dual property checks
- `presets.js` - Lino Playback presets, Show status indicators
- `index.js` - Data structure initialization, safety checks

### Related Dashboard Fixes
Fixed race condition in `rhub-api-dashboard` when switching Shows:
- Clear rundown selection before loading new rundowns
- Filter rundowns by `loadedRundownsInfo` to prevent 404 errors
- Disable non-started Shows in dropdown

---

## 2025-12-29: Version 2.1.1 - Skip Offline Lino Engines When Fetching Rundowns

### Problem
RealityHub server was logging excessive error messages when the companion module polled for rundowns:
```
INFO: Executing action: getRundowns for rundownEngineId: 81
TRACE: Cannot get rundown engine for rundownEngineId: 81, action: getRundowns
```

This occurred because the module was querying rundowns for ALL Lino engines, including those that were offline/not started.

### Root Cause
In `features/rundowns.js`, the code was iterating through all Lino engines:
```javascript
const linoEngineIds = Object.keys(inst.data.linoEngines)
```

This included offline engines (where `started: false`), causing errors on the RealityHub server.

### Solution
Filter Lino engines to only query those that are currently started/online:
```javascript
const linoEngineIds = Object.keys(inst.data.linoEngines).filter(id => inst.data.linoEngines[id].started === true)
```

The `started` property from the Lino engine API indicates whether an engine is currently active and ready to serve requests.

### Files Changed
- `features/rundowns.js` - Only query rundowns from started Lino engines

---

## 2025-12-28: Module Packaging for Offline Distribution

### Problem
`yarn pack` creates a `.tgz` archive with a `package/` root folder, but Bitfocus Companion expects `companion/manifest.json` at the root (or `pkg/` root when using official tools). The "Import module package" feature fails to find the manifest in standard `yarn pack` archives.

### Solution
Use the official Bitfocus Companion build tool (`@companion-module/tools`) which is now configured as the build script.

### How to Build for Distribution
1. Run `yarn build` in the module root.
2. The command executes `companion-module-build`.
3. It generates a properly structured `realityhub-[version].tgz`.
4. This file can be imported directly via the "Import module package" button in Companion.

### Configuration Changes
- Added `"build": "companion-module-build"` script to `package.json`.
- This ensures consistent, compliant packaging for future releases.

---

## 2025-12-28: Version 2.1.0 - Node 22 & RealityHub 2.1 Only

### Breaking Changes
- **Dropped RealityHub 2.0 support** - Module now requires RealityHub 2.1 only
- **API key is now required** - No longer optional for authentication

### Package Manager
- Switched from npm to **yarn** to align with Bitfocus Companion standards
- Removed `package-lock.json`, using `yarn.lock` exclusively

### Dependency Updates
| Package | Old Version | New Version |
|---------|-------------|-------------|
| @companion-module/base | ~1.10.0 | ~1.14.1 |
| @companion-module/tools | ^1.5.0 | ^2.5.0 |

These updates add **Node 22 support** (engine requirement: `^18.12 || ^22.8`).

### Runtime Update
- Updated `manifest.json` runtime type from `node18` to `node22`
- Aligns with Bitfocus Companion's primary runtime environment

### Documentation Updates
- **configFields.js**: Updated info text and API key field (now required, not optional)
- **HELP.md**: Added detailed REST API key setup instructions:
  - User requires "REST API Management" right in RealityHub
  - Steps to create API key in User Management > REST API Keys
  - Explanation of Acquired Modules (Lino, Launcher, Nodegraph Editor)

### Files Changed
- `package.json` - Version bump to 2.1.0, dependency updates
- `yarn.lock` - Regenerated with new dependencies
- `package-lock.json` - Deleted (switched to yarn)
- `companion/manifest.json` - Runtime type node22
- `configFields.js` - RealityHub 2.1 only, API key required
- `companion/HELP.md` - REST API key setup instructions

---

## 2025-12-28: Critical Bug Fix - Lino Engine ID vs Reality Engine ID

### Problem
The module was failing to load rundown items with errors like:
```
Failed to load items for rundown "RD_125" (ID: 110)
HTTPError for "http://172.16.0.118/api/rest/v1/lino/rundown/42/49/items/?api_key=..."
```

Despite rundowns being visible in the RealityHub dashboard and accessible via direct API calls.

### Root Cause
**RealityHub has TWO completely different engine systems with separate ID namespaces:**

| System | Endpoint | Purpose | Example IDs |
|--------|----------|---------|-------------|
| Reality Engines | `GET /api/rest/v1/engines` | Physical render engines | 41, 42, 44, 54, 56, 71 |
| Lino Engines | `GET /api/rest/v1/lino/engines` | Rundown control engines | 60, 65, 77, 81, 89, 92 |

The companion module was incorrectly using Reality Engine IDs (e.g., `42`) for Lino API calls that require Lino Engine IDs (e.g., `77`).

### Example
- Rundown "RD_125" (ID: 110) belongs to **Lino Engine 77** ("Show 125")
- The module was calling: `GET /lino/rundown/42/110/items/` ❌
- Should have called: `GET /lino/rundown/77/110/items/` ✅

### Affected API Endpoints
All Lino endpoints that include `{engineId}` in the path require **Lino Engine IDs**, not Reality Engine IDs:

```
GET  /api/rest/v1/lino/rundowns/{linoEngineId}
GET  /api/rest/v1/lino/rundown/{linoEngineId}/{rundownId}/items/
POST /api/rest/v1/lino/rundown/{linoEngineId}/{rundownId}/items/
POST /api/rest/v1/lino/rundown/{linoEngineId}/{rundownId}/items/{itemId}/buttons/{buttonKey}
PUT  /api/rest/v1/lino/rundown/{linoEngineId}/play/{itemId}/{preview}
PUT  /api/rest/v1/lino/rundown/{linoEngineId}/out/{itemId}/{preview}
... etc
```

### Solution
1. **`features/engines.js`**: Added call to `GET /api/rest/v1/lino/engines` to fetch Lino engines and store them in `inst.data.linoEngines`

2. **`features/rundowns.js`**: Modified to iterate through each Lino engine, fetch its rundowns, and store the `linoEngineId` with each rundown for later use

3. **`features/templates.js`**: Updated to search for template pool rundown across all Lino engines

4. **`actions.js`**: Updated button trigger actions to use the stored `linoEngineId` from each rundown instead of a global ID

### Files Changed
- `features/engines.js` - Fetch and store Lino engines
- `features/rundowns.js` - Use Lino engine IDs for rundown/item queries
- `features/templates.js` - Use Lino engine IDs for template pool
- `actions.js` - Use correct Lino engine ID when triggering buttons

### Reference Implementation
The `rhub-api-dashboard` project correctly handles this in `src/lib/api.ts`:
```typescript
lino: {
    listEngines: () => request('GET', '/api/rest/v1/lino/engines'),
    listRundowns: (engineId: number) => request('GET', `/api/rest/v1/lino/rundowns/${engineId}`),
    listItems: (engineId: number, rundownId: number) => request('GET', `/api/rest/v1/lino/rundown/${engineId}/${rundownId}/items/`),
    // ...
}
```

### Debugging Tip
Use the MCP server to verify correct engine IDs:
```
mcp_rhub-mcp-server_get_v1_lino_eng
```
This returns Lino engines with their `loadedRundownsInfo` showing which rundowns belong to which Lino engine.

---

## 2025-12-28: API Key Authentication

### Issue
Some API calls were failing silently.

### Solution
The module now sends the API key both as:
1. HTTP Header: `X-API-Key: {apiKey}`
2. Query Parameter: `?api_key={apiKey}`

This matches the approach used in `rhub-mcp-server/index.js` for maximum compatibility across all RealityHub API endpoints.

---

## 2025-12-28: Playout API Deprecation Note

### Status
✅ **Verified**: The companion module does NOT use any deprecated Playout endpoints.

### Background
RealityHub has two rundown control APIs:

| API | Status | Playback Control | Button Triggers |
|-----|--------|------------------|-----------------|
| **Playout** (`/api/rest/v1/playout/*`) | ⚠️ DEPRECATED | ❌ No play/out/continue | ✅ Yes |
| **Lino** (`/api/rest/v1/lino/*`) | ✅ Current | ✅ Full control | ✅ Yes |

### Playout Endpoints (DO NOT USE)
```
GET  /api/rest/v1/playout/rundowns
GET  /api/rest/v1/playout/rundowns/{rundownId}
GET  /api/rest/v1/playout/rundowns/{rundownId}/items
POST /api/rest/v1/playout/rundowns/{rundownId}/items/{itemId}/{buttonKey}
GET  /api/rest/v1/playout/templates
```

### Lino Endpoints (USE THESE)
```
GET  /api/rest/v1/lino/engines
GET  /api/rest/v1/lino/rundowns/{engineId}
GET  /api/rest/v1/lino/rundown/{engineId}/{rundownId}/items/
POST /api/rest/v1/lino/rundown/{engineId}/{rundownId}/items/{itemId}/buttons/{buttonKey}
PUT  /api/rest/v1/lino/rundown/{engineId}/play/{itemId}/{preview}
PUT  /api/rest/v1/lino/rundown/{engineId}/out/{itemId}/{preview}
PUT  /api/rest/v1/lino/rundown/{engineId}/continue/{itemId}/{preview}
GET  /api/rest/v1/lino/templates
```

### Key Difference
Lino requires a **Lino Engine ID** in the path, while Playout uses only rundown IDs. See the "Lino Engine ID vs Reality Engine ID" section above for details on obtaining correct Lino Engine IDs.

---

## 2025-12-28: Dynamic Rundown Presets Feature

### Feature Added
Created dynamic presets from rundown item buttons:
- Scans all Lino engines for rundowns
- Extracts buttons from each rundown item
- Creates presets categorized as "Rundown: {rundownName}"
- Users can drag and drop these button presets into their Companion button grid

### Files Changed
- `presets.js` - Added rundown preset generation
- `features/rundowns.js` - Added preset refresh on rundown data update

### Legacy Template Pool
The "Rundown-Name For Templates" config field now supports:
- Specific rundown name (e.g., "CompanionTemplatesPool") for legacy behavior
- Empty or "*" to disable template pool sync and only use the new Rundowns feature
