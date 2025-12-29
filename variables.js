// variables
//
// Exposes RealityHub data as Companion variables for button text, triggers, etc.

import { ms2S } from './tools.js'


let variables = []
let values = {}


function newVar(id, name, value) {
    variables.push({
        variableId: id,
        name: name
    })
    values[id] = value
}

export const getVariables = (inst) => {
    // Reset arrays for fresh generation
    variables = []
    values = {}

    // ========== REALITY ENGINE VARIABLES ==========
    const enginesData = inst.data?.engines || {}
    newVar('connectedEngines', 'Connected Reality Engines', Object.keys(enginesData).length)

    Object.entries(enginesData).forEach(([eID, engine]) => {
        newVar(`engine${eID}_name`, `Engine ${engine.displayName} - Name`, engine.name)
        newVar(`engine${eID}_displayName`, `Engine ${engine.displayName} - Display Name`, engine.displayName)
        newVar(`engine${eID}_ip`, `Engine ${engine.displayName} - IP Address`, engine.ip)
        newVar(`engine${eID}_role`, `Engine ${engine.displayName} - Role`, engine.role)
        newVar(`engine${eID}_status`, `Engine ${engine.displayName} - Status`, engine.status)
        newVar(`engine${eID}_active`, `Engine ${engine.displayName} - Has Active Project`, engine.activeProject ? 'Yes' : 'No')
    })

    // ========== SHOW VARIABLES ==========
    const showsData = inst.data.shows || {}
    newVar('totalShows', 'Total Shows', Object.keys(showsData).length)
    
    // Count running shows (check both running and started)
    const runningShows = Object.values(showsData).filter(s => s.running || s.started).length
    newVar('runningShows', 'Running Shows Count', runningShows)
    
    // List of running show names
    const runningShowNames = Object.values(showsData)
        .filter(s => s.running || s.started)
        .map(s => s.name)
        .join(', ')
    newVar('runningShowNames', 'Running Show Names', runningShowNames || 'None')

    Object.entries(showsData).forEach(([sID, show]) => {
        const prefix = `show${sID}`
        const label = `Show ${show.name}`
        
        // Basic show info (check both running and started)
        const isActive = show.running || show.started
        newVar(`${prefix}_name`, `${label} - Name`, show.name)
        newVar(`${prefix}_running`, `${label} - Running`, isActive ? 'Yes' : 'No')
        newVar(`${prefix}_status`, `${label} - Status`, isActive ? '🟢 Running' : '⚪ Stopped')
        newVar(`${prefix}_mode`, `${label} - Mode`, show.mode || 'unknown')
        
        // Loaded rundowns info
        const loadedRundownIds = (show.loadedRundowns || []).map(r => r.id).join(', ')
        newVar(`${prefix}_loadedRundowns`, `${label} - Loaded Rundown IDs`, loadedRundownIds || 'None')
        newVar(`${prefix}_loadedRundownCount`, `${label} - Loaded Rundown Count`, (show.loadedRundowns || []).length)
        
        // Renderer/Engine info (first renderer for primary display)
        if (show.renderers && show.renderers.length > 0) {
            const primaryRenderer = show.renderers[0]
            
            newVar(`${prefix}_engineCount`, `${label} - Engine Count`, show.renderers.length)
            newVar(`${prefix}_primaryEngine`, `${label} - Primary Engine`, primaryRenderer.engineHostDisplayName || primaryRenderer.engineHostName || 'Unknown')
            newVar(`${prefix}_project`, `${label} - Project`, primaryRenderer.projectName || 'None')
            newVar(`${prefix}_projectVersion`, `${label} - Project Version`, primaryRenderer.projectVersion || 'Unknown')
            newVar(`${prefix}_graph`, `${label} - Graph`, primaryRenderer.graphName || 'None')
            
            // Engine status from log
            if (primaryRenderer.log && primaryRenderer.log.logMessage) {
                newVar(`${prefix}_engineStatus`, `${label} - Engine Status`, primaryRenderer.log.logMessage)
            } else {
                newVar(`${prefix}_engineStatus`, `${label} - Engine Status`, 'Unknown')
            }
            
            // All engine names in this show
            const allEngineNames = show.renderers.map(r => r.engineHostDisplayName || r.engineHostName).join(', ')
            newVar(`${prefix}_allEngines`, `${label} - All Engines`, allEngineNames)
        } else {
            newVar(`${prefix}_engineCount`, `${label} - Engine Count`, 0)
            newVar(`${prefix}_primaryEngine`, `${label} - Primary Engine`, 'None')
            newVar(`${prefix}_project`, `${label} - Project`, 'None')
            newVar(`${prefix}_graph`, `${label} - Graph`, 'None')
            newVar(`${prefix}_engineStatus`, `${label} - Engine Status`, 'No Engines')
            newVar(`${prefix}_allEngines`, `${label} - All Engines`, 'None')
        }
    })

    // ========== PRIMARY SHOW SHORTCUT VARIABLES ==========
    // Quick access to the primary (first running) show's data
    const primaryShowId = inst.data.primaryShowId
    if (primaryShowId && showsData[primaryShowId]) {
        const primaryShow = showsData[primaryShowId]
        newVar('primaryShow_id', 'Primary Show - ID', primaryShowId)
        newVar('primaryShow_name', 'Primary Show - Name', primaryShow.name)
        newVar('primaryShow_running', 'Primary Show - Running', (primaryShow.running || primaryShow.started) ? 'Yes' : 'No')
        
        if (primaryShow.renderers && primaryShow.renderers.length > 0) {
            const pr = primaryShow.renderers[0]
            newVar('primaryShow_engine', 'Primary Show - Engine', pr.engineHostDisplayName || 'Unknown')
            newVar('primaryShow_project', 'Primary Show - Project', pr.projectName || 'None')
            newVar('primaryShow_graph', 'Primary Show - Graph', pr.graphName || 'None')
            newVar('primaryShow_status', 'Primary Show - Status', pr.log?.logMessage || 'Unknown')
        }
    } else {
        newVar('primaryShow_id', 'Primary Show - ID', 'None')
        newVar('primaryShow_name', 'Primary Show - Name', 'No running show')
        newVar('primaryShow_running', 'Primary Show - Running', 'No')
    }

    // ========== RUNDOWN VARIABLES ==========
    const rundownsData = inst.data.rundowns || {}
    newVar('totalRundowns', 'Total Rundowns', Object.keys(rundownsData).length)
    
    // Count rundowns that are loaded on running shows
    const loadedRundownCount = Object.values(rundownsData).filter(r => {
        const showId = inst.data.rundownToShowMap?.[r.id]
        const show = showsData[showId]
        return showId && (show?.running || show?.started)
    }).length
    newVar('loadedRundowns', 'Loaded Rundowns Count', loadedRundownCount)

    // ========== UPDATE TIMING VARIABLES ==========
    const moduleData = inst.data?.module || {}
    newVar('updateEnginesDuration', 'Update Engines-Data Duration', `${ms2S(moduleData.updateEnginesDuration || 0)}s`)
    newVar('updateNodesDuration', 'Update Nodes-Data Duration', `${ms2S(moduleData.updateNodesDuration || 0)}s`)
    newVar('updateNodesProgress', 'Update Nodes-Data Progress', (moduleData.updateNodesProgress || 0) + '%')
    newVar('updateRundownsDuration', 'Update Rundowns-Data Duration', `${ms2S(moduleData.updateRundownsDuration || 0)}s`)
    newVar('updateRundownsProgress', 'Update Rundowns-Data Progress', (moduleData.updateRundownsProgress || 0) + '%')
    newVar('updateTemplatesDuration', 'Update Templates-Data Duration', `${ms2S(moduleData.updateTemplatesDuration || 0)}s`)
    newVar('updateTemplatesProgress', 'Update Templates-Data Progress', (moduleData.updateTemplatesProgress || 0) + '%')

    return [variables, values]
}
