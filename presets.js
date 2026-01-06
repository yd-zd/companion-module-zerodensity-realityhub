// presets

import { combineRgb } from '@companion-module/base'
import { engineSelection } from './features/engines.js'
import { variablePath } from './tools.js'

// NOTE: Button appearance is controlled by multiple feedback layers:
// 1. showStatusInactive: Gray out when show is stopped
// 2. itemNotActive: Desaturate when item is not playing  
// 3. itemPlayingInProgram/Preview: Bright colors when playing
// Feedback priority (last applied wins): show status < not active < playing status

/**
 * Create a grayed-out version of a color for inactive show feedback
 * Used when the entire show is STOPPED - full gray
 */
const grayColor = () => combineRgb(50, 50, 50)

/**
 * Create a desaturated/dimmed version of a color for inactive item feedback
 * Used when show is running but item is NOT playing
 * Keeps hint of original hue but much darker and desaturated
 */
const desaturateColor = (r, g, b) => {
    // Blend toward gray (desaturate)
    const gray = Math.round((r + g + b) / 3)
    const satFactor = 0.7  // 70% toward gray
    const newR = Math.round(r + (gray - r) * satFactor)
    const newG = Math.round(g + (gray - g) * satFactor)
    const newB = Math.round(b + (gray - b) * satFactor)
    // Darken significantly
    const darkFactor = 0.4  // 40% brightness
    return combineRgb(
        Math.round(newR * darkFactor),
        Math.round(newG * darkFactor),
        Math.round(newB * darkFactor)
    )
}

/**
 * Create feedback object for show status - GRAY when show stopped
 */
const createShowStatusFeedback = (rundownId) => ({
    feedbackId: 'showStatusInactive',
    options: { rundown: rundownId },
    style: {
        color: combineRgb(100, 100, 100),  // Gray text
        bgcolor: grayColor()                // Full gray background
    }
})

/**
 * Create feedback object for item not active - DESATURATED when idle
 */
const createItemNotActiveFeedback = (rundownId, itemId, bgR, bgG, bgB) => ({
    feedbackId: 'itemNotActive',
    options: { 
        rundown: rundownId,
        [`item_${rundownId}`]: itemId
    },
    style: {
        color: combineRgb(140, 140, 140),      // Dimmed white text
        bgcolor: desaturateColor(bgR, bgG, bgB) // Desaturated original color
    }
})

/**
 * Create feedback object for item playing in Program - BRIGHT RED
 */
const createItemPlayingProgramFeedback = (rundownId, itemId) => ({
    feedbackId: 'itemPlayingInProgram',
    options: { 
        rundown: rundownId,
        [`item_${rundownId}`]: itemId
    },
    style: {
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(220, 38, 38)  // Bright red
    }
})

/**
 * Create feedback object for item playing in Preview - BRIGHT GREEN
 */
const createItemPlayingPreviewFeedback = (rundownId, itemId) => ({
    feedbackId: 'itemPlayingInPreview',
    options: { 
        rundown: rundownId,
        [`item_${rundownId}`]: itemId
    },
    style: {
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(34, 197, 94)  // Bright green
    }
})

/**
 * Create feedback object for item offline - ORANGE WARNING when not ready on engine
 * Item exists in rundown but Reality Engine hasn't loaded it yet
 */
const createItemOfflineFeedback = (rundownId, itemId) => ({
    feedbackId: 'itemOffline',
    options: { 
        rundown: rundownId,
        [`item_${rundownId}`]: itemId
    },
    style: {
        color: combineRgb(50, 50, 50),
        bgcolor: combineRgb(180, 100, 20)  // Orange warning
    }
})

/**
 * Get item type label for display ('VS' or 'MD')
 * @param {Object} itemData - Item data object
 * @returns {string} Type label or empty string
 */
const getItemTypeLabel = (itemData) => {
    if (!itemData?.itemType) return ''
    return itemData.itemType === 'vs' ? '[VS]' : itemData.itemType === 'md' ? '[MD]' : ''
}

/**
 * Get engine status icon based on connection status
 * @param {string} status - Engine status: 'connected', 'ready', 'disconnected', 'reconnecting'
 * @returns {string} Colored circle emoji
 */
const getEngineStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
        case 'connected':
        case 'ready':
            return '🟢'  // Green - connected/ready
        case 'reconnecting':
            return '🟡'  // Yellow - reconnecting
        case 'disconnected':
            return '🔴'  // Red - disconnected
        default:
            return '⚪'  // Gray - unknown
    }
}

/**
 * Generate engine status icons string for a show
 * Shows compact status of all engines attached to the show
 * @param {object} show - Show object with renderers
 * @param {object} engines - All engines data
 * @returns {string} String of status icons like "🟢🟢" or "🟢🔴"
 */
const getShowEngineIcons = (show, engines) => {
    if (!show?.renderers || show.renderers.length === 0) {
        return '⚪'  // No engines attached
    }
    
    const icons = show.renderers.map(renderer => {
        const engineId = renderer.engineHostId
        const engine = engines?.[engineId]
        return getEngineStatusIcon(engine?.status)
    })
    
    return icons.join('')
}

export const getPresets = (inst) => {
    const presets = []

    // append basic presets for module features
    presets.push({
        category: 'Basic: Features',
        name: 'Update Engines Data',
        type: 'button',
        style: {
            text: 'ENG:\\n\\n' + variablePath(inst, 'updateEnginesDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateEnginesData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'engines' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateEnginesData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    {
        category: 'Basic: Features',
        name: 'Update Nodes Data',
        type: 'button',
        style: {
            text: 'NOD:\\n' + variablePath(inst, 'updateNodesProgress') + '\\n' + variablePath(inst, 'updateNodesDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateNodesData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'nodes' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateNodesData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    {
        category: 'Basic: Features',
        name: 'Update Rundowns Data',
        type: 'button',
        style: {
            text: 'RUN:\\n' + variablePath(inst, 'updateRundownsProgress') + '\\n' + variablePath(inst, 'updateRundownsDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateRundownsData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'rundowns' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateRundownsData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    {
        category: 'Basic: Features',
        name: 'Update Templates Data',
        type: 'button',
        style: {
            text: 'TEM:\\n' + variablePath(inst, 'updateTemplatesProgress') + '\\n' + variablePath(inst, 'updateTemplatesDuration'),
            size: '18',
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(51, 0, 0)
        },
        steps: [
            {
                down: [
                    {
                        actionId: 'basicLoadFeatureData',
                        options: { data: 'updateTemplatesData' }
                    }
                ]
            }
        ],
        feedbacks: [
            {
                feedbackId: 'basicFeatureSelected',
                options: { feature: 'templates' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 51)
                }
            },
            {
                feedbackId: 'basicFeatureDataLoading',
                options: { data: 'updateTemplatesData' },
                style: {
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 255)
                }
            }
        ]
    },
    )

    const engines = engineSelection(inst, true)

    // append basic presets for mixer nodes
    for (let mixer=0; mixer<3; mixer++) {

        for (let channel=1; channel<=10; channel++) {
            presets.push({
                category: `Basic: Mixer_${mixer}`,
                name: `Set preview channel ${channel} on mixer node "Mixer_${mixer}"`,
                type: 'button',
                style: {
                    text: `Ch ${channel}\\nMixer_${mixer}`,
                    size: '18',
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 51, 0)
                },
                steps: [
                    {
                        down: [
                            {
                                actionId: 'basicSetMixerChannel',
                                options: {
                                    engines: engines,
                                    node: `Mixer_${mixer}`,
                                    channel: 'Channels%2F%2FPreviewChannel%2F0',
                                    name: `Channel${channel}`
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: 'basicMixerChannel',
                        options: {
                            engines: engines,
                            node: `Mixer_${mixer}`,
                            channel: 'Channels//PreviewChannel/0',
                            name: `Channel${channel}`
                        },
                        style: {
                            color: combineRgb(0, 0, 0),
                            bgcolor: combineRgb(0, 255, 0)
                        }
                    },
                    {
                        feedbackId: 'basicMixerChannel',
                        options: {
                            engines: engines,
                            node: `Mixer_${mixer}`,
                            channel: 'Channels//ProgramChannel/0',
                            name: `Channel${channel}`
                        },
                        style: {
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    }
                ]
            })
        }

        presets.push({
            category: `Basic: Mixer_${mixer}`,
            name: `Do transition on mixer node "Mixer_${mixer}"`,
            type: 'button',
            style: {
                text: `Trans\\nMixer_${mixer}`,
                size: '18',
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 255, 0)
            },
            steps: [
                {
                    down: [
                        {
                            actionId: 'basicDoTransition',
                            options: {
                                engines: engines,
                                node: `Mixer_${mixer}`
                            }
                        }
                    ]
                }
            ],
            feedbacks: []
        })
    }

    // ========== LAUNCH CONTROL PRESETS ==========
    // Show start/stop buttons for shows with loaded rundowns (filtered by rundown filter)
    if (inst.data.shows && Object.keys(inst.data.shows).length > 0) {
        const shows = inst.data.shows
        const rundowns = inst.data.rundowns || {}
        const rundownToShowMap = inst.data.rundownToShowMap || {}
        
        // Get unique show IDs that have rundowns (respects the rundown filter)
        const showIdsWithRundowns = new Set()
        for (const [rID, rundown] of Object.entries(rundowns)) {
            const showId = rundownToShowMap[rID] || rundown.showId || rundown.linoEngineId
            if (showId) showIdsWithRundowns.add(showId)
        }
        
        // Create Launch Control presets for each show with rundowns
        for (const showId of showIdsWithRundowns) {
            const show = shows[showId]
            if (!show) continue
            
            const showName = show.name || `Show ${showId}`
            const isActive = show.running || show.started
            const statusIcon = isActive ? '🟢' : '⚪'
            
            // Get engine status icons for this show
            const engineIcons = getShowEngineIcons(show, inst.data.engines)
            const engineCount = show.renderers?.length || 0
            
            // Category for this show's launch controls
            const launchCategory = `🚀 Launch Control: ${showName}`
            
            // START button - Green, safe operation
            // Shows engine status icons when running
            presets.push({
                category: launchCategory,
                name: `▶ START`,
                type: 'button',
                style: {
                    text: `▶ START\\n${showName}`,
                    size: '14',
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 120, 0)  // Green
                },
                steps: [{
                    down: [{
                        actionId: 'launchShow',
                        options: { showId: showId }
                    }]
                }],
                feedbacks: [
                    {
                        feedbackId: 'showRunning',
                        options: { showId: showId },
                        style: {
                            text: `✓ RUNNING\\n${engineIcons}\\n${showName}`,
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(0, 180, 0)  // Bright green when running
                        }
                    }
                ]
            })
            
            // STOP button - Double-tap safety
            // First tap: ARMS (button turns RED with "TAP AGAIN!")
            // Second tap within 3s: EXECUTES stop
            // Auto-disarms after 3 seconds if no second tap
            presets.push({
                category: launchCategory,
                name: `⏹ STOP (2x tap)`,
                type: 'button',
                style: {
                    text: `⏹ STOP\\n(tap 2x)\\n${showName}`,
                    size: '14',
                    color: combineRgb(200, 200, 200),
                    bgcolor: combineRgb(60, 60, 60)  // Gray when stopped
                },
                steps: [{
                    down: [{
                        actionId: 'stopShow',
                        options: { showId: showId }
                    }]
                }],
                feedbacks: [
                    {
                        // ARMED state - highest priority (bright red, tap again!)
                        feedbackId: 'stopShowArmed',
                        options: { showId: showId },
                        style: {
                            text: `🔴 TAP AGAIN\\nTO STOP!`,
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(255, 0, 0)  // Bright RED - attention!
                        }
                    },
                    {
                        // Running state - show can be stopped (orange-red)
                        feedbackId: 'showRunning',
                        options: { showId: showId },
                        style: {
                            text: `⏹ STOP\\n(tap 2x)\\n⚠️ ${showName}`,
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(180, 60, 0)  // Orange-red when running
                        }
                    }
                ]
            })
            
            // STATUS button - Display-only, shows current state with engine status icons
            // Engine icons show connection status of each attached engine
            presets.push({
                category: launchCategory,
                name: `Status`,
                type: 'button',
                style: {
                    text: `${statusIcon} ${engineIcons}\\n${showName}\\nSTATUS`,
                    size: '14',
                    color: combineRgb(200, 200, 200),
                    bgcolor: combineRgb(40, 40, 40)
                },
                steps: [{
                    down: []  // No action - display only
                }],
                feedbacks: [
                    {
                        feedbackId: 'showRunning',
                        options: { showId: showId },
                        style: {
                            text: `🟢 ${engineIcons}\\n${showName}\\nRUNNING`,
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(0, 100, 0)
                        }
                    },
                    {
                        feedbackId: 'showStopped',
                        options: { showId: showId },
                        style: {
                            text: `⚪ ${engineIcons}\\n${showName}\\nSTOPPED`,
                            color: combineRgb(150, 150, 150),
                            bgcolor: combineRgb(60, 60, 60)
                        }
                    }
                ]
            })
        }
        
        inst.log('debug', `Generated Launch Control presets for ${showIdsWithRundowns.size} shows`)
    }

    // append rundown presets (only for rundowns loaded on running shows)
    // Combines both playback controls AND Nodos item buttons in the same per-item category
    if (inst.data.rundowns && Object.keys(inst.data.rundowns).length > 0) {
        let totalPresetsCount = 0
        const shows = inst.data.shows || {}
        
        // loop over all rundowns
        for (const [rID, rundown] of Object.entries(inst.data.rundowns)) {
            // Get show info for category naming
            const showId = rundown.showId || rundown.linoEngineId
            const show = showId ? shows[showId] : null
            const showName = rundown.showName || (show ? show.name : 'Unknown')
            const isShowActive = show?.running || show?.started
            const showPrefix = isShowActive ? `🟢 ${showName}` : `⚪ ${showName}`
            
            // Global rundown controls category
            const globalCategory = `${showPrefix} > ${rundown.name}: 🎬 Controls`
            
            // Play Next buttons in global controls
            // These only gray out when show is stopped (no item-specific status)
            presets.push({
                category: globalCategory,
                name: `Play Next → Program`,
                type: 'button',
                style: {
                    text: `▶▶ NEXT\\nPROGRAM`,
                    size: '14',
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(204, 0, 0)
                },
                steps: [{
                    down: [{
                        actionId: 'rundownPlayNext',
                        options: {
                            rundown: `r${rID}`,
                            channel: '0'
                        }
                    }]
                }],
                feedbacks: [createShowStatusFeedback(rID)]  // Gray when show stopped
            })
            
            presets.push({
                category: globalCategory,
                name: `Play Next → Preview`,
                type: 'button',
                style: {
                    text: `▶▶ NEXT\\nPREVIEW`,
                    size: '14',
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 153, 0)
                },
                steps: [{
                    down: [{
                        actionId: 'rundownPlayNext',
                        options: {
                            rundown: `r${rID}`,
                            channel: '1'
                        }
                    }]
                }],
                feedbacks: [createShowStatusFeedback(rID)]  // Gray when show stopped
            })
            
            // ALL OUT buttons (Program All Out / Preview All Out)
            presets.push({
                category: globalCategory,
                name: `ALL OUT ← Program`,
                type: 'button',
                style: {
                    text: `■ ALL\\nPROGRAM`,
                    size: '14',
                    color: combineRgb(0, 0, 0),
                    bgcolor: combineRgb(255, 180, 0)  // Orange-yellow like RealityHub
                },
                steps: [{
                    down: [{
                        actionId: 'rundownAllOut',
                        options: {
                            rundown: `r${rID}`,
                            channel: '0'
                        }
                    }]
                }],
                feedbacks: [createShowStatusFeedback(rID)]  // Gray when show stopped
            })
            
            presets.push({
                category: globalCategory,
                name: `ALL OUT ← Preview`,
                type: 'button',
                style: {
                    text: `■ ALL\\nPREVIEW`,
                    size: '14',
                    color: combineRgb(0, 0, 0),
                    bgcolor: combineRgb(200, 150, 0)  // Darker orange-yellow
                },
                steps: [{
                    down: [{
                        actionId: 'rundownAllOut',
                        options: {
                            rundown: `r${rID}`,
                            channel: '1'
                        }
                    }]
                }],
                feedbacks: [createShowStatusFeedback(rID)]  // Gray when show stopped
            })
            
            // CLEAR OUTPUT buttons (API v2.1.0 - single API call, more efficient)
            presets.push({
                category: globalCategory,
                name: `CLEAR ← Program (v2.1)`,
                type: 'button',
                style: {
                    text: `🗑️ CLEAR\\nPROGRAM`,
                    size: '14',
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(180, 60, 60)  // Red-tinted for clear action
                },
                steps: [{
                    down: [{
                        actionId: 'clearOutput',
                        options: {
                            rundown: `r${rID}`,
                            channel: '0'
                        }
                    }]
                }],
                feedbacks: [createShowStatusFeedback(rID)]  // Gray when show stopped
            })
            
            presets.push({
                category: globalCategory,
                name: `CLEAR ← Preview (v2.1)`,
                type: 'button',
                style: {
                    text: `🗑️ CLEAR\\nPREVIEW`,
                    size: '14',
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(120, 60, 60)  // Darker red-tinted
                },
                steps: [{
                    down: [{
                        actionId: 'clearOutput',
                        options: {
                            rundown: `r${rID}`,
                            channel: '1'
                        }
                    }]
                }],
                feedbacks: [createShowStatusFeedback(rID)]  // Gray when show stopped
            })
            totalPresetsCount += 6  // 4 original + 2 clear output
            
            // Add presets for each item - each item gets its own category
            // Combines BOTH playback controls AND Nodos form buttons
            if (rundown.items) {
                for (const [iID, itemData] of Object.entries(rundown.items)) {
                    // Use item name, falling back to template name, then ID
                    const itemLabel = itemData.name || itemData.template || `Item #${iID}`
                    // Check if item has Nodos buttons (form controls)
                    const hasNodosButtons = itemData.buttons && Object.keys(itemData.buttons).length > 0
                    // Add 🎛️ icon for items with Nodos buttons to distinguish them
                    const itemIcon = hasNodosButtons ? '🎛️ ' : ''
                    // Get item type label (VS or MD) from API v2.1.0
                    const typeLabel = getItemTypeLabel(itemData)
                    const typeSuffix = typeLabel ? ` ${typeLabel}` : ''
                    // Create category per item: "ShowName > RundownName: [icon]ItemName [TYPE]"
                    const itemCategory = `${showPrefix} > ${rundown.name}: ${itemIcon}${itemLabel}${typeSuffix}`
                    
                    // Shorten item name for button display (max ~10 chars)
                    const shortName = itemLabel.length > 10 ? itemLabel.substring(0, 9) + '…' : itemLabel
                    
                    // === PLAYBACK CONTROLS (standard for all items) ===
                    // Feedback layers (applied in order, last wins):
                    // 1. Show inactive = gray (lowest)
                    // 2. Item not active = desaturated (medium)
                    // 3. Item playing = bright (high)
                    // 4. Item offline = orange warning (highest - overrides all)
                    
                    // Play to Preview (green - like in RealityHub UI)
                    // Turns BRIGHT GREEN when item is playing in Preview
                    presets.push({
                        category: itemCategory,
                        name: `Play → Preview`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n▶ PVW`,
                            size: '14',
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(0, 128, 0)  // Base green
                        },
                        steps: [{
                            down: [{
                                actionId: 'rundownItemPlay',
                                options: {
                                    rundown: `r${rID}`,
                                    [`r${rID}`]: `r${rID}_i${iID}`,
                                    channel: '1'
                                }
                            }]
                        }],
                        feedbacks: [
                            createShowStatusFeedback(rID),                              // Gray when show stopped
                            createItemNotActiveFeedback(rID, iID, 0, 128, 0),           // Desaturate when idle
                            createItemPlayingPreviewFeedback(rID, iID),                 // Bright green when playing
                            createItemOfflineFeedback(rID, iID)                         // Orange warning when offline
                        ]
                    })
                    
                    // Out from Preview
                    presets.push({
                        category: itemCategory,
                        name: `Out ← Preview`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n■ PVW`,
                            size: '14',
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(0, 80, 0)  // Dark green base
                        },
                        steps: [{
                            down: [{
                                actionId: 'rundownItemOut',
                                options: {
                                    rundown: `r${rID}`,
                                    [`r${rID}`]: `r${rID}_i${iID}`,
                                    channel: '1'
                                }
                            }]
                        }],
                        feedbacks: [
                            createShowStatusFeedback(rID),                              // Gray when show stopped
                            createItemNotActiveFeedback(rID, iID, 0, 80, 0),            // Desaturate when idle
                            createItemPlayingPreviewFeedback(rID, iID),                 // Bright green when playing
                            createItemOfflineFeedback(rID, iID)                         // Orange warning when offline
                        ]
                    })
                    
                    // Play to Program (red - like in RealityHub UI)
                    // Turns BRIGHT RED when item is playing in Program
                    presets.push({
                        category: itemCategory,
                        name: `Play → Program`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n▶ PGM`,
                            size: '14',
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(180, 0, 0)  // Base red
                        },
                        steps: [{
                            down: [{
                                actionId: 'rundownItemPlay',
                                options: {
                                    rundown: `r${rID}`,
                                    [`r${rID}`]: `r${rID}_i${iID}`,
                                    channel: '0'
                                }
                            }]
                        }],
                        feedbacks: [
                            createShowStatusFeedback(rID),                              // Gray when show stopped
                            createItemNotActiveFeedback(rID, iID, 180, 0, 0),           // Desaturate when idle
                            createItemPlayingProgramFeedback(rID, iID),                 // Bright red when playing
                            createItemOfflineFeedback(rID, iID)                         // Orange warning when offline
                        ]
                    })
                    
                    // Out from Program
                    presets.push({
                        category: itemCategory,
                        name: `Out ← Program`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n■ PGM`,
                            size: '14',
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(100, 0, 0)  // Dark red base
                        },
                        steps: [{
                            down: [{
                                actionId: 'rundownItemOut',
                                options: {
                                    rundown: `r${rID}`,
                                    [`r${rID}`]: `r${rID}_i${iID}`,
                                    channel: '0'
                                }
                            }]
                        }],
                        feedbacks: [
                            createShowStatusFeedback(rID),                              // Gray when show stopped
                            createItemNotActiveFeedback(rID, iID, 100, 0, 0),           // Desaturate when idle
                            createItemPlayingProgramFeedback(rID, iID),                 // Bright red when playing
                            createItemOfflineFeedback(rID, iID)                         // Orange warning when offline
                        ]
                    })
                    
                    // Continue (yellow - for animation continue)
                    // Active when item is playing in EITHER channel
                    presets.push({
                        category: itemCategory,
                        name: `Continue`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n⏯ CONT`,
                            size: '14',
                            color: combineRgb(0, 0, 0),
                            bgcolor: combineRgb(255, 200, 0)  // Base yellow
                        },
                        steps: [{
                            down: [{
                                actionId: 'rundownItemContinue',
                                options: {
                                    rundown: `r${rID}`,
                                    [`r${rID}`]: `r${rID}_i${iID}`,
                                    channel: '0'
                                }
                            }]
                        }],
                        feedbacks: [
                            createShowStatusFeedback(rID),                              // Gray when show stopped
                            createItemNotActiveFeedback(rID, iID, 255, 200, 0),         // Desaturate when idle
                            createItemPlayingProgramFeedback(rID, iID),                 // Bright when in PGM
                            createItemPlayingPreviewFeedback(rID, iID),                 // Bright when in PVW
                            createItemOfflineFeedback(rID, iID)                         // Orange warning when offline
                        ]
                    })
                    
                    totalPresetsCount += 5
                    
                    // === NODOS FORM BUTTONS (if item has buttons) ===
                    // These also get status-aware coloring
                    if (itemData.buttons && Object.keys(itemData.buttons).length > 0) {
                        for (const [buttonKey, buttonLabel] of Object.entries(itemData.buttons)) {
                            // if button is valid add preset
                            if (buttonLabel !== undefined) {
                                // Truncate long labels for button display
                                const shortLabel = buttonLabel.length > 12 ? buttonLabel.substring(0, 11) + '…' : buttonLabel
                                
                                presets.push({
                                    category: itemCategory,  // Same category as playback controls
                                    name: `${buttonLabel}`,  // Full name for tooltip
                                    type: 'button',
                                    style: {
                                        text: shortLabel,  // Truncated label only
                                        size: 'auto',  // Auto-size for better fit
                                        color: combineRgb(255, 255, 255),
                                        bgcolor: combineRgb(0, 153, 128)  // RealityHub form button color
                                    },
                                    steps: [
                                        {
                                            down: [
                                                {
                                                    actionId: 'rundownButtonPress',
                                                    options: {
                                                        rundown: `r${rID}`,
                                                        [`r${rID}`]: `r${rID}_i${iID}`,
                                                        [`r${rID}_i${iID}`]: `r${rID}_i${iID}_b${buttonKey}`
                                                    }
                                                }
                                            ]
                                        }
                                    ],
                                    feedbacks: [
                                        createShowStatusFeedback(rID),                              // Gray when show stopped
                                        createItemNotActiveFeedback(rID, iID, 0, 153, 128),         // Desaturate when idle
                                        createItemPlayingProgramFeedback(rID, iID),                 // Bright when in PGM
                                        createItemPlayingPreviewFeedback(rID, iID),                 // Bright when in PVW
                                        createItemOfflineFeedback(rID, iID)                         // Orange warning when offline
                                    ]
                                })
                                totalPresetsCount++
                            }
                        }
                    }
                }
            }
        }
        inst.log('debug', `Generated ${totalPresetsCount} rundown presets from ${Object.keys(inst.data.rundowns).length} rundowns`)
    } else {
        inst.log('debug', 'No rundown data available for presets')
    }

    // append template presets
    if (inst.data.templates && Object.keys(inst.data.templates).length > 0) {
        const rID = Object.keys(inst.data.templates)[0]
        const templates = inst.data.templates[rID]

        // loop over all items in templatesPool
        for (const [item, itemData] of Object.entries(templates.items)) {

            // loop over all button in template
            for (const [button, buttonLabel] of Object.entries(itemData.buttons)) {

                // if button is valid add preset
                if (buttonLabel !== undefined) presets.push({
                    category: 'Template: ' + itemData.name,
                    name: `Template ${itemData.name} - Button ${buttonLabel}`,
                    type: 'button',
                    style: {
                        text: buttonLabel,
                        size: '18',
                        color: combineRgb(0, 0, 0),
                        bgcolor: combineRgb(255, 255, 0)
                    },
                    steps: [
                        {
                            down: [
                                {
                                    actionId: 'templateButtonPress',
                                    options: { template: `r${rID}_i${item}`, [`r${rID}_i${item}`]:  `r${rID}_i${item}_b${button}` }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: 'templateButtonLabel',
                            options: { template: `r${rID}_i${item}`, [`r${rID}_i${item}`]:  `r${rID}_i${item}_b${button}` },
                            style: {
                                color: combineRgb(255, 255, 255),
                                bgcolor: combineRgb(0, 0, 51)
                            }
                        }
                    ]
                })
            }
        }
    }


    return presets
}