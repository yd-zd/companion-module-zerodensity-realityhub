## Zero Density RealityHub 2.1

This module allows you to control Zero Density RealityHub 2.1 with comprehensive rundown playback control, engine management, and template automation.

---

### RealityHub Architecture

Understanding these concepts helps when configuring actions:

**Physical Layer - Reality Engines:**
- Physical render machines running Nodos (e.g., ENG128, ENG129)
- Each engine has **Dynamic Channels** (outputs like OnAir, Videowall)
- Items render to these channels

**Logical Layer - Shows:**
- Logical groupings that attach to Reality Engines
- **Rundowns** are loaded on Shows
- **Items** in rundowns are assigned to Dynamic Channels

**Playback:**
- Items play to **Preview** (preview output) or **Program** (on-air output)
- Like a broadcast mixer: Dynamic Channel = WHERE, Preview/Program = WHICH bus

**Status Indicators (API v2.1.0+):**
- **Online**: Item loaded on engine, ready to play
- **Playing**: Item currently on-air in Preview or Program
- **Unavailable**: Item cannot be played (engine issue)

---

**Requirements:**
* The "REST API" server feature must be licensed and enabled (Configuration > License > Server Features > REST API)
* A REST API key is required for authentication
* Companion must be on the same network as the RealityHub server

---

### Creating a REST API Key in RealityHub

1. Navigate to **User Management** in RealityHub
2. Your user account must have **REST API Management** right enabled to access the REST API Keys section
3. In the left sidebar under **Management Objects**, expand **REST API Keys**
4. Click the **+** button to create a new API key
5. Give your API key a name (e.g., "Companion")
6. In the **Acquired Modules** section, enable the modules this API key should have access to:
   * **Lino** - Required for rundown control and playback
   * **Launcher** - Required for engine and show management
   * **Nodegraph Editor** - Required for node property control
7. Click **Copy to Clipboard** to copy the API key

---

### Module Configuration

**Connection Settings:**
* **Protocol** - Select HTTP or HTTPS (default: HTTP)
* **IP Address** - Enter the IP address of your RealityHub server
* **Port** - Enter the port number (default: 80 for HTTP, 443 for HTTPS)
* **API Key** - Enter your REST API key (required for authentication)

**Feature Selection:**
* **Nodes** - Enable node property control (can increase startup time)
* **Rundowns** - Enable rundown control with playback actions
* **Templates** - Enable template control with a dedicated template pool

**Rundown Filter (Optional):**
When the Rundowns feature is enabled, you can filter which rundowns appear in presets:
* Enter comma-separated Rundown names (e.g., "Main Show, Breaking News, Weather")
* Only rundowns matching these names will be loaded into presets
* Leave empty to load all rundowns from running shows

**Auto-Update Options:**
* Enable automatic updates for Nodes, Rundowns, or Templates data
* Select update interval (Short, Medium, or Long)

**Template Pool:**
* When the "Templates" feature is selected, enter a rundown name to store templates
* Use "*" or leave empty to disable template pool sync

---

### Available Actions

**Basic Actions:**
* Basic: Do Transition
* Basic: Enable Render
* Basic: Load Feature Data
* Basic: Set Constant Data Value
* Basic: Set Media File Path
* Basic: Set Mixer Channel
* Basic: Trigger Function
* Basic: Trigger Media Function

**Node Actions:**
* Node: Set Property Value
* Node: Trigger Function

**Rundown Actions:**
* Rundown: Button Press - Trigger any button from rundown items
* Rundown: Play Item - Play rundown item to Program (PGM) or Preview (PVW)
* Rundown: Out Item - Take out rundown item from Program or Preview
* Rundown: Continue Item - Continue animation of item on Program or Preview
* Rundown: Play Next - Play next item in rundown to Program or Preview
* Rundown: All Out (Stop All) - Stop ALL items in rundown from Program or Preview

**Template Actions:**
* Template: Button Press

---

### Available Feedbacks

* Basic: Check Constant Data Value
* Basic: Display Constant Data Value
* Basic: Feature Data Loading
* Basic: Feature Selected
* Basic: Media File Path
* Basic: Mixer Channel
* Node: Check Property Value
* Rundown: Button Label
* Template: Button Label

---

### Available Variables

**Engine Information:**
* Connected Engines
* Engine Names
* Engine Roles
* Engine States
* Engine IP-Addresses
* Engine Active Project Launched

**Data Loading Status:**
* Update Engines-Data Duration
* Update Nodes-Data Duration
* Update Nodes-Data Progress
* Update Rundowns-Data Duration
* Update Rundowns-Data Progress
* Update Templates-Data Duration
* Update Templates-Data Progress

---

### Presets

The module automatically generates presets from your RealityHub rundowns:

**Organization:**
* Presets are grouped by Show and Rundown
* Category format: `🟢 ShowName > RundownName: ItemName`
* Green dot (🟢) indicates running shows, gray dot (⚪) indicates stopped shows

**Control Presets (per rundown):**
* ▶▶ NEXT PROGRAM - Play next item to Program
* ▶▶ NEXT PREVIEW - Play next item to Preview
* ■ ALL PROGRAM - Stop all items from Program (All Out)
* ■ ALL PREVIEW - Stop all items from Preview (All Out)

**Item Presets (per item):**
* ▶ PVW - Play item to Preview (green)
* ■ PVW - Out item from Preview (dark green)
* ▶ PGM - Play item to Program (red)
* ■ PGM - Out item from Program (dark red)
* ⏯ CONT - Continue animation (yellow)

All item buttons display the item name on the first line for easy identification.

---

### Troubleshooting

**Connection Issues:**
* Verify the RealityHub server is accessible from the Companion machine
* Check that the REST API feature is licensed and enabled
* Ensure the API key has the required module permissions (Lino, Launcher)
* Try using HTTPS if HTTP connections are blocked

**Rundowns Not Appearing:**
* Check that the Show has rundowns loaded in RealityHub
* Use the Rundown Filter to filter by specific rundown names if needed
* Verify the Show is running - only running shows' rundowns are loaded by default

**Playback Commands Not Working:**
* RealityHub uses Show IDs (not Reality Engine IDs) for Lino API calls
* Ensure the rundown is loaded on a running Show
* Check the Companion logs for detailed error messages

**Security:**
* API keys are sent via HTTP header only (X-API-Key)
* API keys are never exposed in URL query parameters
* Use HTTPS for encrypted communication when possible
