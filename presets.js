// presets

import { combineRgb } from '@companion-module/base'
import { engineSelection } from './features/engines.js'
import { variablePath } from './tools.js'

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

    // append rundown presets (only for rundowns loaded on running shows)
    if (inst.data.rundowns && Object.keys(inst.data.rundowns).length > 0) {
        let rundownPresetsCount = 0
        const shows = inst.data.shows || {}
        
        // loop over all rundowns
        for (const [rID, rundown] of Object.entries(inst.data.rundowns)) {
            // Get show info for category naming
            const showId = rundown.showId || rundown.linoEngineId
            const show = showId ? shows[showId] : null
            const showName = rundown.showName || (show ? show.name : 'Unknown')
            const isShowActive = show?.running || show?.started
            const showPrefix = isShowActive ? `🟢 ${showName}` : `⚪ ${showName}`
            
            // loop over all items in rundown
            if (rundown.items) {
                for (const [iID, itemData] of Object.entries(rundown.items)) {
                    // loop over all buttons in item
                    if (itemData.buttons && Object.keys(itemData.buttons).length > 0) {
                        for (const [buttonKey, buttonLabel] of Object.entries(itemData.buttons)) {
                            // if button is valid add preset
                            if (buttonLabel !== undefined) {
                                presets.push({
                                    category: `${showPrefix} > ${rundown.name}`,
                                    name: `${itemData.name} - ${buttonLabel}`,
                                    type: 'button',
                                    style: {
                                        text: buttonLabel,
                                        size: '18',
                                        color: combineRgb(255, 255, 255),
                                        bgcolor: combineRgb(0, 102, 0)
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
                                        {
                                            feedbackId: 'rundownButtonLabel',
                                            options: {
                                                rundown: `r${rID}`,
                                                [`r${rID}`]: `r${rID}_i${iID}`,
                                                [`r${rID}_i${iID}`]: `r${rID}_i${iID}_b${buttonKey}`
                                            },
                                            style: {
                                                color: combineRgb(255, 255, 255),
                                                bgcolor: combineRgb(0, 51, 0)
                                            }
                                        }
                                    ]
                                })
                                rundownPresetsCount++
                            }
                        }
                    }
                }
            }
        }
        inst.log('debug', `Generated ${rundownPresetsCount} rundown presets from ${Object.keys(inst.data.rundowns).length} rundowns`)
        
        // Add rundown item PLAYBACK control presets (Play/Out/Continue for each item)
        // Organized by show > rundown > item
        let controlPresetsCount = 0
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
                feedbacks: []
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
                feedbacks: []
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
                feedbacks: []
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
                feedbacks: []
            })
            controlPresetsCount += 4
            
            // Add presets for each item - each item gets its own category
            if (rundown.items) {
                for (const [iID, itemData] of Object.entries(rundown.items)) {
                    const itemLabel = itemData.name || `Item #${iID}`
                    // Create category per item: "ShowName > RundownName: ItemName"
                    const itemCategory = `${showPrefix} > ${rundown.name}: ${itemLabel}`
                    
                    // Shorten item name for button display (max ~10 chars)
                    const shortName = itemLabel.length > 10 ? itemLabel.substring(0, 9) + '…' : itemLabel
                    
                    // Play to Preview (green - like in RealityHub UI)
                    presets.push({
                        category: itemCategory,
                        name: `Play → Preview`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n▶ PVW`,
                            size: '14',
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(0, 128, 0)
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
                        feedbacks: []
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
                            bgcolor: combineRgb(0, 80, 0)
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
                        feedbacks: []
                    })
                    
                    // Play to Program (red - like in RealityHub UI)
                    presets.push({
                        category: itemCategory,
                        name: `Play → Program`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n▶ PGM`,
                            size: '14',
                            color: combineRgb(255, 255, 255),
                            bgcolor: combineRgb(180, 0, 0)
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
                        feedbacks: []
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
                            bgcolor: combineRgb(100, 0, 0)
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
                        feedbacks: []
                    })
                    
                    // Continue (yellow - for animation continue)
                    presets.push({
                        category: itemCategory,
                        name: `Continue`,
                        type: 'button',
                        style: {
                            text: `${shortName}\\n⏯ CONT`,
                            size: '14',
                            color: combineRgb(0, 0, 0),
                            bgcolor: combineRgb(255, 200, 0)
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
                        feedbacks: []
                    })
                    
                    controlPresetsCount += 5
                }
            }
            inst.log('info', `Created ${controlPresetsCount} Lino playback presets for rundown "${rundown.name}"`)
        }
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