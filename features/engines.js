// engines
// 
// ARCHITECTURE NOTE:
// - Reality Engines: Physical render machines (/api/rest/v1/engines) - IDs like 41, 42, 44
// - Shows: Logical groupings that control engines (/api/rest/v1/launcher) - IDs like 60, 92, 96
// - Lino "Engines": Same as Shows but with loadedRundownsInfo (/api/rest/v1/lino/engines)
// 
// We fetch BOTH /launcher (rich data) and /lino/engines (loadedRundownsInfo) and merge them

import { getVariables } from '../variables.js'
import { ms2S, isEqual } from '../tools.js'


// Creating multidropdown with all available Reality Engines
export const engineSelection = (inst, defaultOnly=false) => {
    const defaultEngines = []
    const engineChoices = []
    const engines = inst.data?.engines || {}
    for (const [id, engine] of Object.entries(engines)) {
        defaultEngines.push(id)
        engineChoices.push({ id: id, label: engine.displayName })
    }

    if (defaultOnly === true) return defaultEngines

    return {
        type: 'multidropdown',
        id: 'engines',
        label: 'Select Engines:',
        default: defaultEngines,
        choices: engineChoices,
        tooltip: 'Select target Reality Engines for this action or feedback'
    }
}

// Creating normal dropdown with all available Reality Engines
export const engineSelectionSingle = (inst, defaultOnly=false) => {
    let defaultEngine = undefined
    const engineChoices = []
    const engines = inst.data?.engines || {}
    for (const [id, engine] of Object.entries(engines)) {
        if (defaultEngine === undefined) defaultEngine = id
        engineChoices.push({ id: id, label: engine.displayName })
    }

    if (defaultOnly === true) return defaultEngine

    return {
        type: 'dropdown',
        id: 'engine',
        label: 'Select Engine:',
        default: defaultEngine,
        choices: engineChoices,
        tooltip: 'Select target Reality Engine for this action or feedback'
    }
}

// Creating dropdown with all available Shows (for rundown operations)
export const showSelection = (inst, defaultOnly=false, runningOnly=true) => {
    let defaultShow = undefined
    const showChoices = []
    
    for (const [id, show] of Object.entries(inst.data.shows || {})) {
        // Check both running (from /launcher) and started (from /lino/engines)
        const isActive = show.running || show.started
        // Skip non-running shows if runningOnly is true
        if (runningOnly && !isActive) continue
        
        if (defaultShow === undefined) defaultShow = id
        const status = isActive ? '🟢' : '⚪'
        showChoices.push({ id: id, label: `${status} ${show.name}` })
    }

    if (defaultOnly === true) return defaultShow

    return {
        type: 'dropdown',
        id: 'show',
        label: 'Select Show:',
        default: defaultShow,
        choices: showChoices,
        tooltip: 'Select Show for rundown operations (only running shows can trigger actions)'
    }
}

// Creating multidropdown with all available Shows
export const showSelectionMulti = (inst, defaultOnly=false, runningOnly=false) => {
    const defaultShows = []
    const showChoices = []
    
    for (const [id, show] of Object.entries(inst.data.shows || {})) {
        // Check both running (from /launcher) and started (from /lino/engines)
        const isActive = show.running || show.started
        if (runningOnly && !isActive) continue
        
        defaultShows.push(id)
        const status = isActive ? '🟢' : '⚪'
        showChoices.push({ id: id, label: `${status} ${show.name}` })
    }

    if (defaultOnly === true) return defaultShows

    return {
        type: 'multidropdown',
        id: 'shows',
        label: 'Select Shows:',
        default: defaultShows,
        choices: showChoices,
        tooltip: 'Select Shows to monitor or control'
    }
}

// Loading data related to Reality Engines and Shows
export const loadEngines = async (inst) => {

    // Indicate active engine loading
    inst.data.module.updateEnginesData = true

    // Update data loading feedback
    inst.checkFeedbacks('basicFeatureDataLoading')

    // Save start time to calculate elapsed time
    const start = Date.now()

    // Create empty objects
    const engines = {}
    const shows = {}

    // Track if variable definitions need updating
    let setDefinitions = false

    // ========== FETCH REALITY ENGINES ==========
    // GET /api/rest/v1/engines - Physical render machines
    const enginesData = await inst.GET('engines', {}, 'medium')

    if (enginesData !== null) {
        for (const engine of enginesData) {
            engines[engine.id] = {
                name: engine.name,
                displayName: engine.displayName,
                ip: engine.ip,
                role: engine.role,
                status: engine.status,
                activeProject: (engine.rgraphId !== null),
                ownerShowId: engine.ownerShowId || null
            }

            if (!Object.keys(inst.data?.engines || {}).includes(String(engine.id))) {
                setDefinitions = true
            }
        }
    }

    // ========== FETCH SHOWS (Launcher API - Rich Data) ==========
    // GET /api/rest/v1/launcher - Shows with renderers, projects, graphs
    const launcherData = await inst.GET('launcher', {}, 'medium')
    
    if (launcherData !== null && Array.isArray(launcherData)) {
        for (const show of launcherData) {
            shows[show.id] = {
                name: show.name,
                running: show.running,
                mode: show.mode,
                // Renderers contain rich engine/project/graph info
                renderers: (show.renderers || []).map(r => ({
                    id: r.id,
                    engineHostId: r.engineHostId,
                    engineHostName: r.engineHostName,
                    engineHostDisplayName: r.engineHostDisplayName,
                    projectId: r.projectId,
                    projectName: r.projectName,
                    projectVersion: r.projectVersion,
                    graphId: r.graphId,
                    graphName: r.graphName,
                    graphChannels: r.graphChannels || [],
                    log: r.log || null
                })),
                // Will be populated from lino/engines
                loadedRundowns: []
            }

            if (!Object.keys(inst.data.shows || {}).includes(String(show.id))) {
                setDefinitions = true
            }
        }
    }

    // ========== FETCH LINO ENGINES (for loadedRundownsInfo) ==========
    // GET /api/rest/v1/lino/engines - Shows with loadedRundownsInfo
    const linoEnginesData = await inst.GET('lino/engines', {}, 'medium')
    
    if (linoEnginesData !== null && Array.isArray(linoEnginesData)) {
        for (const linoShow of linoEnginesData) {
            // Merge loadedRundownsInfo into shows
            if (shows[linoShow.id]) {
                shows[linoShow.id].loadedRundowns = linoShow.loadedRundownsInfo || []
                shows[linoShow.id].started = linoShow.started
            } else {
                // Show exists in lino but not in launcher (shouldn't happen normally)
                shows[linoShow.id] = {
                    name: linoShow.name,
                    running: linoShow.started,
                    started: linoShow.started,
                    mode: linoShow.mode,
                    renderers: [],
                    loadedRundowns: linoShow.loadedRundownsInfo || []
                }
            }
        }

        // Set primary show ID (prefer running shows - check both running and started)
        const runningShow = Object.entries(shows).find(([id, s]) => s.running === true || s.started === true)
        inst.data.primaryShowId = runningShow ? runningShow[0] : Object.keys(shows)[0]
        
        inst.log('debug', `Found ${Object.keys(shows).length} Shows. Primary Show ID: ${inst.data.primaryShowId}`)
    } else {
        inst.data.primaryShowId = null
        inst.log('warn', 'No Shows found')
    }

    // ========== BUILD RUNDOWN-TO-SHOW MAP ==========
    // This map is critical for rundown button triggers
    // Check BOTH running (from /launcher) and started (from /lino/engines)
    inst.data.rundownToShowMap = {}
    for (const [showId, show] of Object.entries(shows)) {
        const isActive = show.running || show.started
        if (isActive && show.loadedRundowns) {
            for (const rd of show.loadedRundowns) {
                inst.data.rundownToShowMap[rd.id] = showId
            }
        }
    }
    inst.log('debug', `Rundown-to-Show map: ${JSON.stringify(inst.data.rundownToShowMap)}`)

    // Also maintain linoEngines for backward compatibility
    inst.data.linoEngines = {}
    for (const [showId, show] of Object.entries(shows)) {
        inst.data.linoEngines[showId] = {
            name: show.name,
            started: show.running,
            mode: show.mode,
            loadedRundowns: show.loadedRundowns,
            realityEngines: show.renderers.map(r => ({ id: r.engineHostId, name: r.engineHostName }))
        }
    }
    inst.data.linoEngineId = inst.data.primaryShowId

    // Save elapsed time
    inst.data.module.updateEnginesDuration = Date.now() - start

    // Update data if changed
    const enginesChanged = !isEqual(inst.data.engines, engines)
    const showsChanged = !isEqual(inst.data.shows, shows)

    if (enginesChanged || showsChanged) {
        // Save new data
        inst.data.engines = engines
        inst.data.shows = shows

        // Get variable definitions and values
        const [def, val] = getVariables(inst)

        // Set variable definitions if necessary
        if (setDefinitions) inst.setVariableDefinitions(def)

        // Set variable values
        inst.updateVariables(val)
        
        inst.log('info', `Updated: ${Object.keys(engines).length} Reality Engines, ${Object.keys(shows).length} Shows`)
    } else {
        // Only update duration variable
        inst.updateVariables({ updateEnginesDuration: `${ms2S(inst.data.module.updateEnginesDuration)}s` })
    }

    // Indicate inactive engine loading
    inst.data.module.updateEnginesData = false

    // Update data loading feedback
    inst.checkFeedbacks('basicFeatureDataLoading')
}
