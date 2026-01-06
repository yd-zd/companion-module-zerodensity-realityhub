// rundowns
//
// Loads rundown data from RealityHub and creates button options for actions
//
// IMPORTANT: Rundowns must be LOADED on a RUNNING Show to trigger buttons
// - GET /lino/rundowns returns ALL rundowns (not filtered by show)
// - We filter to only show rundowns that are loaded on running shows
// - Use inst.data.rundownToShowMap to get the correct Show ID for API calls
//
// ITEM STATUS FEATURE (API v2.1.0+):
// - API returns status for each item: { preview, program, isActive, activeIn, online }
// - status.preview / status.program: "Available" | "Playing" | "Unavailable"
// - status.isActive: boolean (true if playing in any channel)
// - status.activeIn: ["preview"] | ["program"] | ["preview", "program"]
// - status.online: boolean (whether item is loaded and ready on any engine)

import { getActions } from '../actions.js'
import { getFeedbacks } from '../feedbacks.js'
import { getPresets } from '../presets.js'
import { keyValueLogic, ms2S, isEqual } from '../tools.js'

// ============ ITEM STATUS HELPER FUNCTIONS ============

/**
 * Get item status from cached rundown data
 * @param {Object} inst - Module instance
 * @param {string|number} rundownId - Rundown ID
 * @param {string|number} itemId - Item ID
 * @returns {Object|null} Status object or null if not available
 */
export const getItemStatus = (inst, rundownId, itemId) => {
    const rundown = inst.data.rundowns?.[rundownId]
    if (!rundown?.items) return null
    
    const item = rundown.items[itemId]
    return item?.status || null
}

/**
 * Check if item is playing in a specific channel
 * @param {Object} inst - Module instance
 * @param {string|number} rundownId - Rundown ID
 * @param {string|number} itemId - Item ID
 * @param {string} channel - 'program' or 'preview'
 * @returns {boolean}
 */
export const isItemPlaying = (inst, rundownId, itemId, channel) => {
    const status = getItemStatus(inst, rundownId, itemId)
    if (!status) return false
    
    return status[channel] === 'Playing'
}

/**
 * Check if item is active (playing in any channel)
 * @param {Object} inst - Module instance
 * @param {string|number} rundownId - Rundown ID
 * @param {string|number} itemId - Item ID
 * @returns {boolean}
 */
export const isItemActive = (inst, rundownId, itemId) => {
    const status = getItemStatus(inst, rundownId, itemId)
    if (!status) return false
    
    return status.isActive === true
}

/**
 * Check if channel is available for an item
 * @param {Object} inst - Module instance
 * @param {string|number} rundownId - Rundown ID
 * @param {string|number} itemId - Item ID
 * @param {string} channel - 'program' or 'preview'
 * @returns {boolean}
 */
export const isChannelAvailable = (inst, rundownId, itemId, channel) => {
    const status = getItemStatus(inst, rundownId, itemId)
    if (!status) return true // No status info = assume available
    
    const channelStatus = status[channel]
    // Official API uses "Unavailable", legacy may use "Idle" - support both
    return ['Available', 'Playing'].includes(channelStatus)
}

/**
 * Check if item is online (loaded and ready on engine)
 * @param {Object} inst - Module instance
 * @param {string|number} rundownId - Rundown ID
 * @param {string|number} itemId - Item ID
 * @returns {boolean}
 */
export const isItemOnline = (inst, rundownId, itemId) => {
    const status = getItemStatus(inst, rundownId, itemId)
    if (!status) return true // No status info = assume online (backward compat)
    
    return status.online === true
}

/**
 * Get item type ('vs' = Nodos/VS, 'md' = Motion Design)
 * @param {Object} inst - Module instance
 * @param {string|number} rundownId - Rundown ID
 * @param {string|number} itemId - Item ID
 * @returns {string|null} 'vs', 'md', or null if not available
 */
export const getItemType = (inst, rundownId, itemId) => {
    const rundown = inst.data.rundowns?.[rundownId]
    if (!rundown?.items) return null
    
    const item = rundown.items[itemId]
    return item?.itemType || null
}

// ============ END ITEM STATUS HELPER FUNCTIONS ============


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

    // MERGE STRATEGY: Initialize with existing rundowns to preserve state during show restarts
    let rundowns = { ...inst.data.rundowns }

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
    // Apply Rundown Name filter if configured
    const showFilterStr = inst.config.showFilter || ''
    const showFilter = showFilterStr.split(',').map(s => s.trim()).filter(s => s !== '')
    const hasFilter = showFilter.length > 0

    const targetShows = Object.entries(shows).filter(([id, show]) => {
        // Must have loaded rundowns
        if (!show.loadedRundowns || show.loadedRundowns.length === 0) return false
        
        // We filter rundowns later by name, so we include all shows that have rundowns here
        return true
    })
    
    if (targetShows.length === 0) {
        // Only warn if we really have no shows with rundowns
        if (!hasFilter) {
            inst.log('warn', 'Skipping rundown update: No shows have loaded rundowns')
        }
        inst.data.module.updateRundownsData = false
        return
    }
    
    const targetShowIds = targetShows.map(([id]) => id)
    // inst.log('info', `Querying rundowns for ${targetShows.length} show(s) with loaded rundowns: ${targetShowIds.join(', ')}`)

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
    // inst.log('info', `Found ${loadedRundownIds.size} rundowns from loadedRundownsInfo: ${[...loadedRundownIds].join(', ')}`)

    // Query rundowns API to get full rundown details (including names)
    // Use /lino/rundowns (without showId) to get ALL rundowns across all shows
    const rundownsData = await inst.GET('lino/rundowns', {}, 'medium')
    
    if (rundownsData === null || !Array.isArray(rundownsData)) {
        inst.log('warn', 'Failed to fetch rundowns from API')
        inst.data.module.updateRundownsData = false
        return
    }
    
    // Filter to only rundowns that are loaded on our target shows
    // AND apply the Rundown Name filter if configured
    const loadedRundowns = rundownsData.filter(rd => {
        // Must be loaded on a show
        if (!loadedRundownIds.has(rd.id)) return false
        
        // Apply Name filter if configured
        if (hasFilter) {
            return showFilter.some(name => rd.name === name || rd.name.includes(name))
        }
        
        return true
    })
    
    // inst.log('info', `Filtered to ${loadedRundowns.length} loaded rundowns out of ${rundownsData.length} total from API`)
    
    totalSteps = loadedRundowns.length + 1

    // PARALLEL FETCHING: Fetch all items in parallel using Promise.all
    const itemPromises = loadedRundowns.map(async (rundown) => {
        const rundownKey = rundown.id
        const showInfo = rundownToShow[rundown.id] || { showId: targetShowIds[0], showName: 'Unknown' }
        const showId = showInfo.showId
        
        // Initialize rundown entry using name from API response
        // We preserve existing items if update fails
        const existingItems = rundowns[rundownKey]?.items || {}
        
        const newRundownEntry = {
            name: rundown.name,  // Get name from API, not from loadedRundownsInfo
            showId: showId,
            showName: showInfo.showName,
            linoEngineId: showId,
            items: existingItems // Start with existing items
        }

        // Request items for this rundown using correct Show ID
        const itemsData = await inst.GET(`lino/rundown/${showId}/${rundown.id}/items/`, {}, 'medium')

        if (itemsData !== null && Array.isArray(itemsData)) {
            const newItems = {}
            let statusCount = 0
            
            for (const item of itemsData) {
                const itemId = item.id
                
                newItems[itemId] = {
                    name: item.name,
                    template: item.template || null,
                    buttons: {},
                    // Store item status for feedback updates (API v2.1.0)
                    status: item.status || null,
                    // Store item type: 'vs' = Nodos/VS, 'md' = Motion Design (API v2.1.0)
                    itemType: item.itemType || null
                }
                
                // Count items with status for logging
                if (item.status) statusCount++

                // Update button labels
                if (item.buttons) {
                    for (const [key, label] of Object.entries(item.buttons)) {
                        newItems[itemId].buttons[key] = label || key
                    }
                }
            }
            newRundownEntry.items = newItems // Replace items with fresh data
            
            // Log status info for debugging
            if (statusCount > 0) {
                inst.log('debug', `Loaded ${Object.keys(newItems).length} items for "${rundown.name}" (${statusCount} with status)`)
            }
        } else {
            // Log as debug, not warning (common for empty rundowns or during load)
            // inst.log('debug', `No items found for rundown "${rundown.name}" (ID: ${rundown.id}) on Show ${showId}`)
        }
        
        // Update progress (atomic increment not needed as we just calculate % at end or periodically)
        // But since this is parallel, we can't easily update progress bar per item sequentially in a meaningful way 
        // without a counter.
        
        return { key: rundownKey, data: newRundownEntry }
    })
    
    // Wait for all item requests to complete
    const results = await Promise.all(itemPromises)
    
    // Update rundowns object with results
    for (const result of results) {
        rundowns[result.key] = result.data
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
        // Check all rundown-related feedbacks including item status
        inst.checkFeedbacks(
            'rundownButtonLabel',
            'itemPlayingInProgram',
            'itemPlayingInPreview',
            'itemIsActive',
            'itemStatusIndicator',
            'itemOffline',
            'itemTypeVS',
            'itemTypeMD',
            'showStatusInactive'
        )
    } else {
        // Even if rundowns didn't change structurally, item status may have changed
        // Check status feedbacks on every poll
        inst.checkFeedbacks(
            'itemPlayingInProgram',
            'itemPlayingInPreview',
            'itemIsActive',
            'itemStatusIndicator',
            'itemOffline'
        )
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
