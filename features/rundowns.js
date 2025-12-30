// rundowns
//
// Loads rundown data from RealityHub and creates button options for actions
//
// IMPORTANT: Rundowns must be LOADED on a RUNNING Show to trigger buttons
// - GET /lino/rundowns returns ALL rundowns (not filtered by show)
// - We filter to only show rundowns that are loaded on running shows
// - Use inst.data.rundownToShowMap to get the correct Show ID for API calls

import { getActions } from '../actions.js'
import { getFeedbacks } from '../feedbacks.js'
import { getPresets } from '../presets.js'
import { keyValueLogic, ms2S, isEqual } from '../tools.js'


// Creates dropdown options for rundown selection (only loaded rundowns)
export const rundownSelection = (inst, includeAll = false) => {
    const choices = []
    let defaultChoice = undefined
    
    const rundowns = inst.data.rundowns || {}
    const rundownToShowMap = inst.data.rundownToShowMap || {}
    const shows = inst.data.shows || {}
    
    for (const [rID, rundown] of Object.entries(rundowns)) {
        const showId = rundownToShowMap[rID]
        const show = showId ? shows[showId] : null
        
        // Skip rundowns not loaded on any running show (unless includeAll)
        // Check both running (from /launcher) and started (from /lino/engines)
        const isShowActive = show && (show.running || show.started)
        if (!includeAll && !isShowActive) continue
        
        const showName = show ? show.name : 'Unknown'
        const label = `${rundown.name} (${showName})`
        
        if (defaultChoice === undefined) defaultChoice = rID
        choices.push({ id: rID, label: label })
    }
    
    return {
        type: 'dropdown',
        id: 'rundown',
        label: 'Rundown:',
        default: defaultChoice,
        choices: choices,
        tooltip: 'Select rundown (only shows rundowns loaded on running shows)'
    }
}

// Creates dropdown options for selecting rundown items (for play/out/continue actions)
export const rundownItemOptions = (rundowns, rundownToShowMap, shows) => {
    const rOption = {
        type: 'dropdown',
        label: 'Rundown:',
        id: 'rundown',
        default: undefined,
        choices: []
    }

    const itemOptions = []

    for (const [rID, rundown] of Object.entries(rundowns)) {
        const showId = rundownToShowMap ? rundownToShowMap[rID] : null
        const show = showId && shows ? shows[showId] : null
        
        // Only include rundowns that are loaded on running shows
        const isShowActive = show && (show.running || show.started)
        if (!isShowActive) continue
        
        const rIDs = `r${rID}`
        const showName = show.name
        
        if (rOption.default === undefined) rOption.default = rIDs
        rOption.choices.push({ id: rIDs, label: `${rundown.name} (${showName})` })

        const itemOption = {
            type: 'dropdown',
            label: 'Item:',
            id: rIDs,
            default: undefined,
            choices: [],
            isVisibleData: { rundown: rIDs },
            isVisible: (options, data) => options.rundown === data.rundown
        }

        if (rundown.items !== undefined) {
            for (const [iID, item] of Object.entries(rundown.items)) {
                const iIDs = `r${rID}_i${iID}`
                if (itemOption.default === undefined) itemOption.default = iIDs
                itemOption.choices.push({ id: iIDs, label: `#${iID} ${item.name}` })
            }
        }

        itemOptions.push(itemOption)
    }

    // Add channel selection (Program or Preview)
    const channelOption = {
        type: 'dropdown',
        label: 'Channel:',
        id: 'channel',
        default: '0',
        choices: [
            { id: '0', label: 'Program (PGM)' },
            { id: '1', label: 'Preview (PVW)' }
        ],
        tooltip: 'Select output channel: Program (on-air) or Preview'
    }

    return [rOption, ...itemOptions, channelOption]
}

// Creates dropdown options for PlayNext action (no item selection needed)
export const rundownPlayNextOptions = (rundowns, rundownToShowMap, shows) => {
    const rOption = {
        type: 'dropdown',
        label: 'Rundown:',
        id: 'rundown',
        default: undefined,
        choices: []
    }

    for (const [rID, rundown] of Object.entries(rundowns)) {
        const showId = rundownToShowMap ? rundownToShowMap[rID] : null
        const show = showId && shows ? shows[showId] : null
        
        const isShowActive = show && (show.running || show.started)
        if (!isShowActive) continue
        
        const rIDs = `r${rID}`
        const showName = show.name
        
        if (rOption.default === undefined) rOption.default = rIDs
        rOption.choices.push({ id: rIDs, label: `${rundown.name} (${showName})` })
    }

    const channelOption = {
        type: 'dropdown',
        label: 'Channel:',
        id: 'channel',
        default: '0',
        choices: [
            { id: '0', label: 'Program (PGM)' },
            { id: '1', label: 'Preview (PVW)' }
        ],
        tooltip: 'Select output channel: Program (on-air) or Preview'
    }

    return [rOption, channelOption]
}

// Creates dropdown options for all rundown buttons with visibility logic
export const rundownButtonOptions = (rundowns, rundownToShowMap, shows) => {
    const allowed = ['rundown']
    const items = []
    const buttons = []

    const rOption = {
        type: 'dropdown',
        label: 'Rundown:',
        id: 'rundown',
        default: undefined,
        choices: []
    }

    for (const [rID, rundown] of Object.entries(rundowns)) {
        const showId = rundownToShowMap ? rundownToShowMap[rID] : null
        const show = showId && shows ? shows[showId] : null
        
        // Only include rundowns that are loaded on running shows
        // Check both running (from /launcher) and started (from /lino/engines)
        const isShowActive = show && (show.running || show.started)
        if (!isShowActive) continue
        
        const rIDs = `r${rID}`
        const showName = show.name
        
        if (rOption.default === undefined) rOption.default = rIDs
        rOption.choices.push({ id: rIDs, label: `${rundown.name} (${showName})` })
        allowed.push(rIDs)

        const itemOption = {
            type: 'dropdown',
            label: 'Item:',
            id: rIDs,
            default: undefined,
            choices: [],
            isVisibleData: { rundown: rIDs },
            isVisible: keyValueLogic
        }

        if (rundown.items !== undefined) {
            for (const [iID, item] of Object.entries(rundown.items)) {
                const iIDs = `r${rID}_i${iID}`
                if (itemOption.default === undefined) itemOption.default = iIDs
                itemOption.choices.push({ id: iIDs, label: item.name })
                allowed.push(iIDs)

                const buttonOption = {
                    type: 'dropdown',
                    label: 'Button:',
                    id: iIDs,
                    default: undefined,
                    choices: [],
                    isVisibleData: { rundown: rIDs, [rIDs]: iIDs },
                    isVisible: keyValueLogic
                }

                if (item.buttons !== undefined) {
                    for (const [bID, name] of Object.entries(item.buttons)) {
                        const bIDs = `r${rID}_i${iID}_b${bID}`
                        if (buttonOption.default === undefined) buttonOption.default = bIDs
                        buttonOption.choices.push({ id: bIDs, label: name })
                    }
                }

                buttons.push(buttonOption)
            }
        }

        items.push(itemOption)
    }

    return [rOption].concat(items).concat(buttons)
}

// Loading data related to rundowns
export const loadRundowns = async (inst) => {

    // Indicate active rundowns loading
    inst.data.module.updateRundownsData = true

    // Update data loading feedback
    inst.checkFeedbacks('basicFeatureDataLoading')

    // Save start time to calculate elapsed time
    const start = Date.now()

    // Set progress to 0%
    inst.data.module.updateRundownsProgress = 0
    inst.updateVariables({ updateRundownsProgress: inst.data.module.updateRundownsProgress + '%' })

    // Create empty rundowns object
    let rundowns = {}

    let totalSteps = 0
    let currentStep = 0
    
    // Check if we have Shows with rundown data
    const shows = inst.data.shows || {}
    const rundownToShowMap = inst.data.rundownToShowMap || {}
    
    if (Object.keys(shows).length === 0) {
        inst.log('warn', 'Skipping rundown update: No Shows available')
        inst.data.module.updateRundownsData = false
        return
    }

    // Get ALL shows that have loaded rundowns (regardless of running status)
    // Apply show filter if configured
    const showFilterStr = inst.config.showFilter || ''
    const showFilter = showFilterStr.split(',').map(s => s.trim()).filter(s => s !== '')
    const hasFilter = showFilter.length > 0

    const targetShows = Object.entries(shows).filter(([id, show]) => {
        // Must have loaded rundowns
        if (!show.loadedRundowns || show.loadedRundowns.length === 0) return false
        
        if (hasFilter) {
            // Strict filtering: only include shows matching the filter (ID or Name)
            return showFilter.includes(String(id)) || showFilter.includes(show.name)
        }
        // Default: include ALL shows with loaded rundowns
        return true
    })
    
    if (targetShows.length === 0) {
        const msg = hasFilter 
            ? 'Skipping rundown update: No shows match the configured filter' 
            : 'Skipping rundown update: No shows have loaded rundowns'
        inst.log('warn', msg)
        inst.data.module.updateRundownsData = false
        return
    }
    
    const targetShowIds = targetShows.map(([id]) => id)
    inst.log('info', `Querying rundowns for ${targetShows.length} show(s) with loaded rundowns: ${targetShowIds.join(', ')}`)

    // Build a map of rundown ID -> show ID from loadedRundownsInfo
    // Note: loadedRundownsInfo only contains { id }, not { id, name }
    const loadedRundownIds = new Set()
    const rundownToShow = {}  // Maps rundownId -> { showId, showName }
    for (const [showId, show] of targetShows) {
        for (const rd of (show.loadedRundowns || [])) {
            loadedRundownIds.add(rd.id)
            rundownToShow[rd.id] = { showId, showName: show.name }
        }
    }
    inst.log('info', `Found ${loadedRundownIds.size} rundowns from loadedRundownsInfo: ${[...loadedRundownIds].join(', ')}`)

    // Query rundowns API to get full rundown details (including names)
    // Use /lino/rundowns (without showId) to get ALL rundowns across all shows
    const rundownsData = await inst.GET('lino/rundowns', {}, 'medium')
    
    if (rundownsData === null || !Array.isArray(rundownsData)) {
        inst.log('warn', 'Failed to fetch rundowns from API')
        inst.data.module.updateRundownsData = false
        return
    }
    
    // Filter to only rundowns that are loaded on our target shows
    const loadedRundowns = rundownsData.filter(rd => loadedRundownIds.has(rd.id))
    inst.log('info', `Filtered to ${loadedRundowns.length} loaded rundowns out of ${rundownsData.length} total from API`)
    
    totalSteps = loadedRundowns.length + 1

    for (const rundown of loadedRundowns) {
        const rundownKey = rundown.id
        const showInfo = rundownToShow[rundown.id] || { showId: targetShowIds[0], showName: 'Unknown' }
        const showId = showInfo.showId
        
        // Create rundown entry using name from API response
        rundowns[rundownKey] = {
            name: rundown.name,  // Get name from API, not from loadedRundownsInfo
            showId: showId,
            showName: showInfo.showName,
            linoEngineId: showId,
            items: {}
        }

        // Request items for this rundown using correct Show ID
        const itemsData = await inst.GET(`lino/rundown/${showId}/${rundown.id}/items/`, {}, 'medium')

        if (itemsData !== null && Array.isArray(itemsData)) {
            for (const item of itemsData) {
                const itemId = item.id
                
                rundowns[rundownKey].items[itemId] = {
                    name: item.name,
                    template: item.template || null,
                    buttons: {}
                }

                // Update button labels
                if (item.buttons) {
                    for (const [key, label] of Object.entries(item.buttons)) {
                        rundowns[rundownKey].items[itemId].buttons[key] = label || key
                    }
                }
            }
            
            inst.log('info', `Loaded ${Object.keys(rundowns[rundownKey].items).length} items for rundown "${rundown.name}" (Show: ${showInfo.showName})`)
        } else {
            inst.log('warn', `No items found for rundown "${rundown.name}" (ID: ${rundown.id}) on Show ${showId}`)
        }

        // Update progress
        currentStep++
        inst.data.module.updateRundownsProgress = Math.floor(100 * currentStep / totalSteps)
        inst.updateVariables({ updateRundownsProgress: inst.data.module.updateRundownsProgress + '%' })
        if (!inst.moduleInitiated) inst.updateStatus('LOAD: Rundowns data ...', inst.data.module.updateRundownsProgress + '%')
    }

    if (inst.enableRequests === false) {
        inst.data.module.updateRundownsData = false
        return
    }

    // Only update rundowns if requested data is different from previous rundown data
    if (!isEqual(inst.data.rundowns, rundowns)) {
        inst.data.rundowns = rundowns
        inst.log('info', `Updating definitions with ${Object.keys(rundowns).length} rundowns (loaded on running shows)`)
        inst.setActionDefinitions(getActions(inst))
        inst.setFeedbackDefinitions(getFeedbacks(inst))
        inst.setPresetDefinitions(getPresets(inst))
        inst.checkFeedbacks('rundownButtonLabel')
    }
    
    // Set progress to 100%
    inst.data.module.updateRundownsProgress = 100

    // Save elapsed time
    inst.data.module.updateRundownsDuration = Date.now() - start

    // Update variables
    inst.updateVariables({
        updateRundownsProgress: inst.data.module.updateRundownsProgress + '%',
        updateRundownsDuration: `${ms2S(inst.data.module.updateRundownsDuration)}s`,
    })

    // Indicate inactive rundowns loading
    inst.data.module.updateRundownsData = false

    // Update "basicDataLoading" feedback
    inst.checkFeedbacks('basicFeatureDataLoading')
}
