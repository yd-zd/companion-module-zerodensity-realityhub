// actions

import { nodeFunctionsOptions, nodePropertiesOptions } from './features/nodes.js'
import { rundownButtonOptions, rundownItemOptions, rundownPlayNextOptions, refreshRundownItemStatus, isItemPlaying, getItemStatus } from './features/rundowns.js'
import { templateButtonOptions } from './features/templates.js'
import { sString, contains, deepSetProperty, featureInactive, convertToFunctionId, featureLogic } from './tools.js'
import { engineSelection } from './features/engines.js'


// ============ BUTTON DEBOUNCE & OPTIMISTIC UI ============
// Prevents rapid repeated button presses and provides instant visual feedback

// Cooldown tracker: { 'rundownId_itemId_channel': timestamp }
const buttonCooldowns = {}
const COOLDOWN_MS = 1500 // 1.5 second cooldown between presses

/**
 * Check if a button is in cooldown period
 * @param {string} key - Unique button key (rundownId_itemId_channel)
 * @returns {boolean} True if button is in cooldown
 */
const isInCooldown = (key) => {
    const lastPress = buttonCooldowns[key]
    if (!lastPress) return false
    return (Date.now() - lastPress) < COOLDOWN_MS
}

/**
 * Mark a button as pressed (start cooldown)
 * @param {string} key - Unique button key
 */
const markButtonPressed = (key) => {
    buttonCooldowns[key] = Date.now()
}

/**
 * Apply optimistic UI update - immediately toggle visual state before API response
 * @param {Object} inst - Module instance
 * @param {string} rundownId - Rundown ID
 * @param {string} itemId - Item ID
 * @param {string} channelKey - 'preview' or 'program'
 * @param {boolean} willBePlaying - Expected state after toggle
 */
const applyOptimisticUpdate = (inst, rundownId, itemId, channelKey, willBePlaying) => {
    const rundown = inst.data.rundowns?.[rundownId]
    if (!rundown?.items?.[itemId]) return

    const item = rundown.items[itemId]
    if (!item.status) {
        item.status = { preview: 'Available', program: 'Available', isActive: false, activeIn: [], online: true }
    }

    // Update status optimistically
    item.status[channelKey] = willBePlaying ? 'Playing' : 'Available'
    item.status.isActive = item.status.preview === 'Playing' || item.status.program === 'Playing'

    // Update activeIn array
    const activeIn = []
    if (item.status.preview === 'Playing') activeIn.push('preview')
    if (item.status.program === 'Playing') activeIn.push('program')
    item.status.activeIn = activeIn

    // Trigger immediate visual update
    inst.checkFeedbacks(
        'itemPlayingInProgram',
        'itemPlayingInPreview',
        'itemIsActive',
        'itemStatusIndicator',
        'itemNotActive',
        'itemOffline',
        'itemTypeVS',
        'itemTypeMD',
        'itemOnlineMD',
        'itemOnlineVS'
    )

    inst.log('debug', `Optimistic update: Item ${itemId} ${channelKey}=${willBePlaying ? 'Playing' : 'Available'}`)
}

function createActions(inst) {
    // set default actions
    const actions = {
        basicDoTransition: {
            name: 'Basic: Do Transition',
            description: 'Trigger "DoTransition" function of specified node for selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    required: true,
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)

                // return if required values empty
                if ([event.options.node].includes('')) return

                // loop ovber all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/functions/Default%2F%2FDoTransition%2F0`

                    try {
                        // trigger of "DoTransition"
                        const response = await inst.POST(endpoint)

                        if (response.success === true) {
                            // request property data of selected node to update feedbacks
                            let properties = await inst.GET(`engines/${engine}/nodes/${sString(event.options.node)}/properties`)

                            // loop over all properties in response to find transision duration
                            for (const property of properties) {
                                if (property.PropertyPath.includes('DoTransition/Duration')) {
                                    // set timeout for duration of transition (+3% extra time)
                                    setTimeout(async () => {
                                        // request properties of selected node to update feedbacks
                                        properties = await inst.GET(
                                            `engines/${engine}/nodes/${sString(event.options.node)}/properties`,
                                            {},
                                            'medium'
                                        )

                                        // loop over all properties in response to find feedback relevant data
                                        for (const property of properties) {
                                            if (property.PropertyPath.includes('ProgramChannel')) {
                                                deepSetProperty(
                                                    inst.data.nodes,
                                                    [engine, event.options.node, 'properties', property.PropertyPath],
                                                    property.Value
                                                )
                                            }
                                            else if (property.PropertyPath.includes('PreviewChannel')) {
                                                deepSetProperty(
                                                    inst.data.nodes,
                                                    [engine, event.options.node, 'properties', property.PropertyPath],
                                                    property.Value
                                                )
                                            }
                                        }

                                        // check feedbacks to update buttons
                                        inst.checkFeedbacks('basicMixerChannel', 'nodesCheckPropertyValue')
                                    }, property.Value * 1030)
                                    break
                                }
                            }
                        }
                        // throw error if "success" !== true
                        else throw new Error('ResponseError')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicEnableRender: {
            name: 'Basic: Enable Render',
            description: 'Set the current "EnableRender" state of specified node for selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    required: true,
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'checkbox',
                    label: 'EnableRender:',
                    id: 'render',
                    default: true,
                    tooltip: 'Select state for "EnableRender" of specified node!',
                },
            ],
            callback: async (event) => {
                // return if required values empty
                if ([event.options.node].includes('')) return false

                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)

                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/Actor%2F%2FEnableRender%2F0`

                    // request new constant value
                    try {
                        const response = await inst.PATCH(endpoint, { Value: event.options.render })
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        // deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        // inst.checkFeedbacks('basicDisplayConstantDataValue', 'basicCheckConstantDataValue', 'nodesCheckPropertyValue')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicLoadFeatureData: {
            name: 'Basic: Load Feature Data',
            description: 'Load specific data from RealityHub server',
            options: [
                {
                    type: 'dropdown',
                    label: 'Data:',
                    id: 'data',
                    default: 'updateEnginesData',
                    choices: [
                        { id: 'updateEnginesData', label: 'Engines' },
                        { id: 'updateNodesData', label: 'Nodes' },
                        { id: 'updateRundownsData', label: 'Rundowns' },
                        { id: 'updateTemplatesData', label: 'Templates' },
                    ],
                    tooltip: 'Select data target to manually load specific data from RealityHub server'
                },
                {
                    type: 'static-text',
                    id: 'infoNodes',
                    label: 'IMPORTANT: Please select the "Nodes" feature in the module configuration!',
                    isVisibleData: { config: inst.config, feature: 'nodes', id: 'updateNodesData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'instructionNodes',
                    label: '(Connections > Module > Edit connection > Select additional Features > Nodes)',
                    isVisibleData: { config: inst.config, feature: 'nodes', id: 'updateNodesData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'infoRundowns',
                    label: 'IMPORTANT: Please select the "Rundowns" feature in the module configuration!',
                    isVisibleData: { config: inst.config, feature: 'rundowns', id: 'updateRundownsData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'instructionRundowns',
                    label: '(Connections > Module > Edit connection > Select additional Features > Rundowns)',
                    isVisibleData: { config: inst.config, feature: 'rundowns', id: 'updateRundownsData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'infoTemplates',
                    label: 'IMPORTANT: Please select the "Templates" feature in the module configuration!',
                    isVisibleData: { config: inst.config, feature: 'templates', id: 'updateTemplatesData' },
                    isVisible: featureLogic
                },
                {
                    type: 'static-text',
                    id: 'instructionTemplates',
                    label: '(Connections > Module > Edit connection > Select additional Features > Templates)',
                    isVisibleData: { config: inst.config, feature: 'templates', id: 'updateTemplatesData' },
                    isVisible: featureLogic
                },
            ],
            callback: async (event) => {

                switch (event.options.data) {
                    case 'updateEnginesData':
                        if (inst.data.module.updateEnginesData === true) break
                        inst.pollEngines(inst)
                        break
                    case 'updateNodesData':
                        if (inst.data.module.updateNodesData === true) break
                        else if (contains(inst.config.features, 'nodes')) inst.pollNodes(inst)
                        break
                    case 'updateRundownsData':
                        if (inst.data.module.updateRundownsData === true) break
                        else if (contains(inst.config.features, 'rundowns'))
                            inst.pollRundowns(inst)
                        break
                    case 'updateTemplatesData':
                        if (inst.data.module.updateTemplatesData === true) break
                        else if (contains(inst.config.features, 'templates'))
                            inst.pollTemplates(inst)
                        break
                }
            }
        },
        basicSetConstantDataValue: {
            name: 'Basic: Set Constant Data Value',
            description: 'Set the value of constant data nodes such as "ConstantBoolean", "ConstantFloat", "ConstantInteger" and "ConstantString".',
            options: [
                engineSelection(inst),
                {
                    type: 'dropdown',
                    label: 'Data Type:',
                    id: 'type',
                    default: 'boolean',
                    choices: [
                        { id: 'boolean', label: 'ConstantBoolean' },
                        { id: 'booleanVar', label: 'ConstantBoolean (variable)' },
                        { id: 'float', label: 'ConstantFloat' },
                        { id: 'floatVar', label: 'ConstantFloat (variable)' },
                        { id: 'integer', label: 'ConstantInteger' },
                        { id: 'integerVar', label: 'ConstantInteger (variable)' },
                        { id: 'string', label: 'ConstantString' },
                    ],
                    tooltip: 'Select data type you want to change',
                },
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    required: true,
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'checkbox',
                    label: 'Boolean State:',
                    id: 'boolean',
                    tooltip: 'Enter the "Boolean" value for the specified "ConstantBoolean" node',
                    isVisible: (options) => options.type === 'boolean'
                },
                {
                    type: 'textinput',
                    label: 'Boolean State (variable):',
                    id: 'booleanVar',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter variable for "Boolean" value of specified "ConstantBoolean" node',
                    isVisible: (options) => options.type === 'booleanVar'
                },
                {
                    type: 'number',
                    label: 'Float Value:',
                    id: 'float',
                    useVariables: true,
                    default: 0,
                    step: 0.01,
                    tooltip: 'Enter the "Float" value for the specified "ConstantFloat" node',
                    isVisible: (options) => options.type === 'float'
                },
                {
                    type: 'textinput',
                    label: 'Float Value (variable):',
                    id: 'floatVar',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter variable for "Float" value of specified "ConstantFloat" node',
                    isVisible: (options) => options.type === 'floatVar'
                },
                {
                    type: 'number',
                    label: 'Integer Value:',
                    id: 'integer',
                    useVariables: true,
                    default: 0,
                    step: 1,
                    tooltip: 'Enter the "Integer" value for the specified "ConstantInteger" node',
                    isVisible: (options) => options.type === 'integer'
                },
                {
                    type: 'textinput',
                    label: 'Integer Value (variable):',
                    id: 'integerVar',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter variable for "Integer" value of specified "ConstantInteger" node',
                    isVisible: (options) => options.type === 'integerVar'
                },
                {
                    type: 'textinput',
                    label: 'String Value:',
                    id: 'string',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter the "String" value for the specified "ConstantString" node',
                    isVisible: (options) => options.type === 'string'
                }
            ],
            callback: async (event) => {
                // return if required values empty
                if ([event.options.node].includes('')) return false

                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)
                event.options.value = await inst.parseVariablesInString(event.options[event.options.type])

                switch (event.options.type) {
                    case 'boolean':
                    case 'booleanVar':
                        event.options.property = 'Default%2F%2FBoolean%2F0'
                        event.options.value = (event.options.value !== 'true') ? false : true
                        break

                    case 'float':
                    case 'floatVar':
                        event.options.property = 'Default%2F%2FFloat%2F0'
                        event.options.value = parseFloat(event.options.value)
                        break

                    case 'integer':
                    case 'integerVar':
                        event.options.property = 'Default%2F%2FInteger%2F0'
                        event.options.value = parseInt(event.options.value)
                        break

                    case 'string':
                        event.options.property = 'Default%2F%2FString%2F0'
                        event.options.value = sString(event.options.value)
                        break

                    // return on invalid data type
                    default: return
                }

                // return on invalid value parse
                if (event.options.value === 'NaN') return

                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/${event.options.property}`

                    // request new constant value
                    try {
                        const response = await inst.PATCH(endpoint, { Value: event.options.value })
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        inst.checkFeedbacks('basicDisplayConstantDataValue', 'basicCheckConstantDataValue', 'nodesCheckPropertyValue')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicSetMediaFilePath: {
            name: 'Basic: Set Media File Path',
            description: 'Set a path to a file on the RealityShare server',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    required: true,
                    default: 'MediaInput_0',
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'textinput',
                    label: 'Directory:',
                    id: 'directory',
                    useVariables: true,
                    default: `\\\\${inst.config.host}\\Reality_Share\\Reality\\Assets\\`,
                    tooltip: 'Enter the root directory of all files (use "backslash" \\ to indicate sub directory)'
                },
                {
                    type: 'textinput',
                    label: 'File Path:',
                    id: 'path',
                    useVariables: true,
                    default: '',
                    tooltip: 'Enter the file path (use "backslash" \\ to indicate sub directory)'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)
                event.options.directory = await inst.parseVariablesInString(event.options.directory)
                event.options.path = await inst.parseVariablesInString(event.options.path)

                // return if required values empty
                if ([event.options.node].includes('')) return

                // add backslash to end of directory if not there
                if (!event.options.directory.endsWith('\\')) event.options.directory += '\\'

                // remove backslash from start of file path if there
                if (event.options.path.startsWith('\\')) event.options.path = event.options.path.slice(1)

                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/File%2F%2FFilePath%2F0`

                    // request new file path
                    try {
                        const response = await inst.PATCH(endpoint, { Value: sString(event.options.directory + event.options.path) })
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        inst.checkFeedbacks('basicFilePath', 'nodesCheckPropertyValue')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicSetMixerChannel: {
            name: 'Basic: Set Mixer Channel',
            description: 'Set preview/programm channel of mixer node for selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    required: true,
                    default: 'Mixer_0',
                    tooltip: 'Enter name of mixer node. Node names should match across all engines!'
                },
                {
                    type: 'dropdown',
                    label: 'Target:',
                    id: 'channel',
                    default: 'Channels%2F%2FPreviewChannel%2F0',
                    choices: [
                        { id: 'Channels%2F%2FPreviewChannel%2F0', label: 'Preview' },
                        { id: 'Channels%2F%2FProgramChannel%2F0', label: 'Program' }
                    ],
                    tooltip: 'Select "Preview" or "Program" as target for this action'
                },
                {
                    type: 'dropdown',
                    label: 'Channel:',
                    id: 'name',
                    default: 'Channel1',
                    choices: [
                        { id: 'Channel1', label: 'Channel 1' },
                        { id: 'Channel2', label: 'Channel 2' },
                        { id: 'Channel3', label: 'Channel 3' },
                        { id: 'Channel4', label: 'Channel 4' },
                        { id: 'Channel5', label: 'Channel 5' },
                        { id: 'Channel6', label: 'Channel 6' },
                        { id: 'Channel7', label: 'Channel 7' },
                        { id: 'Channel8', label: 'Channel 8' },
                        { id: 'Channel9', label: 'Channel 9' },
                        { id: 'Channel10', label: 'Channel 10' }
                    ],
                    tooltip: 'Select channel to set to selected target'
                },
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)

                // return if required values empty
                if ([event.options.node].includes('')) return

                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/${event.options.channel}`

                    // request new mixer channel
                    try {
                        const response = await inst.PATCH(endpoint, { Value: event.options.name })

                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response.PropertyPath], response.Value)
                        inst.checkFeedbacks('basicMixerChannel', 'nodesCheckPropertyValue')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicTriggerFunction: {
            name: 'Basic: Trigger Function',
            description: 'Trigger a function on all selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    useVariables: true,
                    required: true,
                    default: '',
                    tooltip: 'Enter name of node. Node names should match across all engines!'
                },
                {
                    type: 'textinput',
                    label: 'Function Name:',
                    id: 'function',
                    useVariables: true,
                    required: true,
                    default: 'Do Transition',
                    tooltip: 'Enter function name. Function names should match across all engines!'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)
                event.options.function = await inst.parseVariablesInString(event.options.function)

                // return if required values empty
                if ([event.options.node, event.options.function].includes('')) return

                // convert function name to proper function id
                const functionId = convertToFunctionId(event.options.function)

                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/functions/${sString(functionId)}`

                    // request trigger of function
                    try {
                        const response = await inst.POST(endpoint)
                        if ((response.success !== true)) throw new Error('ResponseError')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        },
        basicTriggerMediaFunction: {
            name: 'Basic: Trigger Media Function',
            description: 'Trigger playback functions of specified media node for selected engines',
            options: [
                engineSelection(inst),
                {
                    type: 'textinput',
                    label: 'Node Name:',
                    id: 'node',
                    default: 'MediaInput_0',
                    tooltip: 'Enter name of media node. Node names should match across all engines!'
                },
                {
                    type: 'dropdown',
                    label: 'Function:',
                    id: 'function',
                    default: 'Default%2F%2FPlay%2F0',
                    choices: [
                        { id: 'Default%2F%2FPlay%2F0', label: 'Play' },
                        { id: 'Default%2F%2FPause%2F0', label: 'Pause' },
                        { id: 'Default%2F%2FRewind%2F0', label: 'Rewind' }
                    ],
                    tooltip: 'Select playback function'
                },
                {
                    type: 'checkbox',
                    label: 'Loop Media:',
                    id: 'loop',
                    default: true,
                    tooltip: 'Change between loop playback and single playback'
                }
            ],
            callback: async (event) => {
                // parse variables from text input
                event.options.node = await inst.parseVariablesInString(event.options.node)

                // return if required values empty
                if ([event.options.node].includes('')) return

                // loop ovber all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoints
                    const endpoint1 = `engines/${engine}/nodes/${sString(event.options.node)}/functions/${event.options.function}`
                    const endpoint2 = `engines/${engine}/nodes/${sString(event.options.node)}/properties/Media%2F%2FLoop%2F0`

                    try {
                        // trigger playback function
                        const response1 = await inst.POST(endpoint1)

                        // throw error if "success" !== true
                        if (response1.success !== true) throw new Error('ResponseError')

                        // change loop property
                        const response2 = await inst.PATCH(endpoint2, { Value: event.options.loop })

                        // throw error if loop property change was not successful
                        if (response2.PropertyPath !== 'Media//Loop/0' || response2.Value !== event.options.loop) throw new Error('PropertyError')
                        deepSetProperty(inst.data.nodes, [engine, event.options.node, 'properties', response2.PropertyPath], response2.Value)
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            },
        },
        nodeSetPropertyValue: featureInactive(
            'Nodes', 'Node: Set Property Value (INACTIVE!)', 'Set any property of specified node for selected engines'
        ),
        nodeTriggerFunction: featureInactive(
            'Nodes', 'Node: Trigger Function (INACTIVE!)', 'Trigger any function of specified node for selected engines'
        ),
        rundownButtonPress: featureInactive(
            'Rundowns', 'Rundown: Button Press (INACTIVE!)', 'Trigger any button from selected rundowns'
        ),
        rundownItemPlay: featureInactive(
            'Rundowns', 'Rundown: Play Item (INACTIVE!)', 'Play a rundown item to Program or Preview'
        ),
        rundownItemOut: featureInactive(
            'Rundowns', 'Rundown: Out Item (INACTIVE!)', 'Take out a rundown item from Program or Preview'
        ),
        rundownItemContinue: featureInactive(
            'Rundowns', 'Rundown: Continue Item (INACTIVE!)', 'Continue animation of a rundown item'
        ),
        rundownPlayNext: featureInactive(
            'Rundowns', 'Rundown: Play Next (INACTIVE!)', 'Play the next item in the rundown'
        ),
        templateButtonPress: featureInactive(
            'Templates', 'Template: Button Press (INACTIVE!)', 'Trigger any button from selected template'
        ),
    }

    // set node actions if feature selected
    if (contains(inst.config.features, 'nodes') && Object.keys(inst.data.nodes).length > 0) {

        actions.nodeSetPropertyValue = {
            name: 'Node: Set Property Value',
            description: 'Set any property of specified node for selected engines',
            options: nodePropertiesOptions(inst),
            callback: async (event) => {
                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/properties/${sString(event.options[event.options.node])}`

                    // create body
                    const body = {}
                    for (const [inputKey, data] of Object.entries(inst.data.module.inputNodeMappings)) {
                        if (data.nodes.includes(event.options.node) && data.properties.includes(event.options[event.options.node])) {
                            const bodyKeys = inputKey.split(',')

                            if (bodyKeys.length === 1 && event.options[inputKey] !== undefined) {
                                body.Value = sString(await inst.parseVariablesInString(event.options[inputKey]))
                            }
                            else if (bodyKeys.length === 2 && event.options[inputKey] !== undefined) {
                                if (body[bodyKeys[0]] === undefined) body[bodyKeys[0]] = {}
                                body[bodyKeys[0]][bodyKeys[1]] = await inst.parseVariablesInString(event.options[inputKey])
                            }
                            else return
                        }
                    }

                    try {
                        // request new properties
                        const response = await inst.PATCH(endpoint, body)
                        if (Object.keys(response).length === 0) throw new Error('ResponseError')
                        inst.data.nodes[engine][event.options.node].properties[response.PropertyPath] = response.Value
                        inst.checkFeedbacks('nodesCheckPropertyValue', 'basicMixerChannel', 'basicMediaFilePath', 'basicDisplayConstantDataValue', 'basicCheckConstantDataValue')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        }

        actions.nodeTriggerFunction = {
            name: 'Node: Trigger Function',
            description: 'Trigger any function of specified node for selected engines',
            options: nodeFunctionsOptions(inst),
            callback: async (event) => {
                // loop over all selected engines
                event.options.engines.forEach(async (engine) => {
                    // create endpoint
                    const endpoint = `engines/${engine}/nodes/${sString(event.options.node)}/functions/${sString(event.options[event.options.node])}`

                    try {
                        // request function trigger
                        const response = await inst.POST(endpoint)
                        if (response.success !== true) throw new Error('ResponseError')
                    }
                    catch (error) {
                        inst.log('error', `Action execution failed! (action: ${event.actionId}, engine: ${engine})\n` + error)
                    }
                })
            }
        }
    }

    // set rundown actions if feature selected
    // Only show rundowns that are loaded on running shows
    if (contains(inst.config.features, 'rundowns') && Object.keys(inst.data.rundowns).length > 0) {

        actions.rundownButtonPress = {
            name: 'Rundown: Button Press',
            description: 'Trigger any button from rundowns loaded on running shows',
            options: rundownButtonOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                const parts = event.options[event.options[event.options.rundown]].split('_')
                const rID = parts[0]
                const iID = parts[1]
                const bID = parts.slice(2).join('_')

                // Get the Show ID associated with this rundown
                const rundownId = rID.substring(1)
                const rundown = inst.data.rundowns[rundownId]

                // Use showId (preferred) or fall back to linoEngineId (backward compat)
                const showId = rundown?.showId || rundown?.linoEngineId
                if (!rundown || !showId) {
                    inst.log('error', `Cannot trigger button: No Show ID for rundown ${rundownId}`)
                    return
                }

                // Verify the show is still running (check both running and started)
                const show = inst.data.shows?.[showId]
                const isShowActive = show?.running || show?.started
                if (!isShowActive) {
                    inst.log('warn', `Show "${show?.name || showId}" is not running. Button may not work.`)
                }

                const itemId = iID.substring(1)
                const buttonKey = bID.substring(1)
                const endpoint = `lino/rundown/${showId}/${rundownId}/items/${itemId}/buttons/${sString(buttonKey)}`

                inst.log('debug', `Triggering button: Show="${show?.name}" (ID=${showId}), Rundown="${rundown.name}" (ID=${rundownId}), Item=${itemId}, Button=${buttonKey}`)

                // Lino API: POST /api/rest/v1/lino/rundown/{showId}/{rundownId}/items/{itemId}/buttons/{buttonKey}
                const response = await inst.POST(endpoint)
                if (response === null) {
                    inst.log('warn', `Button trigger may have failed for: ${endpoint}`)
                }
            }
        }

        // Helper function to parse rundown item selection
        const parseRundownItemSelection = (event) => {
            // Parse the item selection: "r{rundownId}_i{itemId}"
            const itemSelection = event.options[event.options.rundown]
            if (!itemSelection) return null

            const parts = itemSelection.split('_')
            const rundownId = parts[0].substring(1) // Remove 'r' prefix
            const itemId = parts[1].substring(1) // Remove 'i' prefix

            const rundown = inst.data.rundowns[rundownId]
            const map = inst.data.rundownToShowMap || {}
            const showId = rundown?.showId ?? rundown?.linoEngineId ?? map[rundownId] ?? map[String(rundownId)]
            const show = inst.data.shows?.[showId]
            const channel = event.options.channel || '0'

            return { rundownId, itemId, showId, show, rundown, channel }
        }

        // Play Item: PUT /lino/rundown/{showId}/play/{itemId}/{preview}
        actions.rundownItemPlay = {
            name: 'Rundown: Play Item',
            description: 'Play a rundown item to Program (PGM) or Preview (PVW). Has 1.5s cooldown.',
            options: rundownItemOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                const parsed = parseRundownItemSelection(event)
                if (!parsed || !parsed.showId) {
                    inst.log('error', 'Cannot play item: Invalid selection')
                    return
                }

                const { rundownId, showId, itemId, show, channel } = parsed
                const channelName = channel === '1' ? 'Preview' : 'Program'
                const channelKey = channel === '1' ? 'preview' : 'program'

                // Check channel availability
                const status = getItemStatus(inst, rundownId, itemId)
                if (status?.[channelKey] === 'Unavailable') {
                    inst.log('warn', `Cannot play item: ${channelName} channel is Unavailable for this item.`)
                    return
                }

                // Check cooldown
                const cooldownKey = `${rundownId}_${itemId}_${channel}_play`
                if (isInCooldown(cooldownKey)) {
                    inst.log('debug', `Play button in cooldown, ignoring: ${cooldownKey}`)
                    return
                }
                markButtonPressed(cooldownKey)

                // Optimistic UI: Immediately show as playing
                applyOptimisticUpdate(inst, rundownId, itemId, channelKey, true)

                const endpoint = `lino/rundown/${showId}/play/${itemId}/${channel}`
                inst.log('debug', `Playing item to ${channelName}: Show="${show?.name}", Item=${itemId}`)

                const response = await inst.PUT(endpoint)
                if (response === null) {
                    inst.log('warn', `Play item may have failed for: ${endpoint}`)
                    // Revert optimistic update on failure
                    applyOptimisticUpdate(inst, rundownId, itemId, channelKey, false)
                } else {
                    // Refresh real status from API
                    refreshRundownItemStatus(inst, showId, rundownId)
                }
            }
        }

        // Out Item: PUT /lino/rundown/{showId}/out/{itemId}/{preview}
        actions.rundownItemOut = {
            name: 'Rundown: Out Item',
            description: 'Take out a rundown item from Program (PGM) or Preview (PVW). Has 1.5s cooldown.',
            options: rundownItemOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                const parsed = parseRundownItemSelection(event)
                if (!parsed || !parsed.showId) {
                    inst.log('error', 'Cannot out item: Invalid selection')
                    return
                }

                const { rundownId, showId, itemId, show, channel } = parsed
                const channelName = channel === '1' ? 'Preview' : 'Program'
                const channelKey = channel === '1' ? 'preview' : 'program'

                // Check cooldown
                const cooldownKey = `${rundownId}_${itemId}_${channel}_out`
                if (isInCooldown(cooldownKey)) {
                    inst.log('debug', `Out button in cooldown, ignoring: ${cooldownKey}`)
                    return
                }
                markButtonPressed(cooldownKey)

                // Optimistic UI: Immediately show as not playing
                applyOptimisticUpdate(inst, rundownId, itemId, channelKey, false)

                const endpoint = `lino/rundown/${showId}/out/${itemId}/${channel}`
                inst.log('debug', `Taking out item from ${channelName}: Show="${show?.name}", Item=${itemId}`)

                const response = await inst.PUT(endpoint)
                if (response === null) {
                    inst.log('warn', `Out item may have failed for: ${endpoint}`)
                    // Revert optimistic update on failure (was playing before)
                    applyOptimisticUpdate(inst, rundownId, itemId, channelKey, true)
                } else {
                    // Refresh real status from API
                    refreshRundownItemStatus(inst, showId, rundownId)
                }
            }
        }

        // Continue Item: PUT /lino/rundown/{showId}/continue/{itemId}/{preview}
        actions.rundownItemContinue = {
            name: 'Rundown: Continue Item',
            description: 'Continue animation of a rundown item on Program (PGM) or Preview (PVW)',
            options: rundownItemOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                const parsed = parseRundownItemSelection(event)
                if (!parsed || !parsed.showId) {
                    inst.log('error', 'Cannot continue item: Invalid selection')
                    return
                }

                const { rundownId, showId, itemId, show, channel } = parsed
                const channelName = channel === '1' ? 'Preview' : 'Program'
                const channelKey = channel === '1' ? 'preview' : 'program'

                // Check channel availability
                const status = getItemStatus(inst, rundownId, itemId)
                if (status?.[channelKey] === 'Unavailable') {
                    inst.log('warn', `Cannot continue item: ${channelName} channel is Unavailable for this item.`)
                    return
                }

                const endpoint = `lino/rundown/${showId}/continue/${itemId}/${channel}`

                inst.log('debug', `Continuing item on ${channelName}: Show="${show?.name}", Item=${itemId}`)

                const response = await inst.PUT(endpoint)
                if (response === null) {
                    inst.log('warn', `Continue item may have failed for: ${endpoint}`)
                } else {
                    // Refresh status immediately after successful command
                    refreshRundownItemStatus(inst, showId, rundownId)
                }
            }
        }

        // Next Item: PUT /lino/rundown/{showId}/next/{itemId}/{channel}
        actions.rundownItemNext = {
            name: 'Rundown: Next Item Step',
            description: 'Play the next cue/step of a rundown item on Program (PGM) or Preview (PVW)',
            options: rundownItemOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                const parsed = parseRundownItemSelection(event)
                if (!parsed || !parsed.showId) {
                    inst.log('error', 'Cannot trigger next: Invalid selection')
                    return
                }

                const { rundownId, showId, itemId, show, channel } = parsed
                const channelName = channel === '1' ? 'Preview' : 'Program'
                const channelKey = channel === '1' ? 'preview' : 'program'

                // Check channel availability
                const status = getItemStatus(inst, rundownId, itemId)
                if (status?.[channelKey] === 'Unavailable') {
                    inst.log('warn', `Cannot trigger next: ${channelName} channel is Unavailable for this item.`)
                    return
                }

                const endpoint = `lino/rundown/${showId}/next/${itemId}/${channel}`

                inst.log('debug', `Triggering next on ${channelName}: Show="${show?.name}", Item=${itemId}`)

                const response = await inst.PUT(endpoint)
                if (response === null) {
                    inst.log('warn', `Next item step may have failed for: ${endpoint}`)
                } else {
                    // Refresh status immediately
                    refreshRundownItemStatus(inst, showId, rundownId)
                }
            }
        }

        // Toggle Item: Play if not playing, Out if playing (like RealityHub UI)
        actions.rundownItemToggle = {
            name: 'Rundown: Toggle Item (Play/Out)',
            description: 'Toggle item state: Play if not playing, Out if already playing. Single button control like RealityHub UI. Has 1.5s cooldown to prevent rapid presses.',
            options: rundownItemOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                const parsed = parseRundownItemSelection(event)
                if (!parsed || !parsed.showId) {
                    inst.log('error', 'Cannot toggle item: Invalid selection')
                    return
                }

                const { rundownId, showId, itemId, show, channel } = parsed
                const channelName = channel === '1' ? 'Preview' : 'Program'
                const channelKey = channel === '1' ? 'preview' : 'program'

                // Check cooldown - prevent rapid repeated presses
                const cooldownKey = `${rundownId}_${itemId}_${channel}`
                if (isInCooldown(cooldownKey)) {
                    inst.log('debug', `Button in cooldown, ignoring press: ${cooldownKey}`)
                    return
                }
                markButtonPressed(cooldownKey)

                // Check current play state
                const isPlaying = isItemPlaying(inst, rundownId, itemId, channelKey)
                const willBePlaying = !isPlaying

                // Check channel availability only when trying to PLAY
                if (willBePlaying) {
                    const status = getItemStatus(inst, rundownId, itemId)
                    if (status?.[channelKey] === 'Unavailable') {
                        inst.log('warn', `Cannot play item: ${channelName} channel is Unavailable for this item.`)
                        return
                    }
                }

                // OPTIMISTIC UI: Immediately update visual state before API call
                applyOptimisticUpdate(inst, rundownId, itemId, channelKey, willBePlaying)

                // Toggle: Out if playing, Play if not
                const action = isPlaying ? 'out' : 'play'
                const endpoint = `lino/rundown/${showId}/${action}/${itemId}/${channel}`

                inst.log('debug', `Toggle ${channelName}: ${action.toUpperCase()} item ${itemId} (was ${isPlaying ? 'playing' : 'not playing'})`)

                const response = await inst.PUT(endpoint)
                if (response === null) {
                    inst.log('warn', `Toggle item may have failed for: ${endpoint}`)
                    // Revert optimistic update on failure
                    applyOptimisticUpdate(inst, rundownId, itemId, channelKey, isPlaying)
                } else {
                    // Refresh real status from API to confirm state
                    refreshRundownItemStatus(inst, showId, rundownId)
                }
            }
        }

        // Play Next: PUT /lino/rundown/{showId}/playnext/{preview}
        actions.rundownPlayNext = {
            name: 'Rundown: Play Next',
            description: 'Play the next item in the rundown to Program (PGM) or Preview (PVW)',
            options: rundownPlayNextOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                // Get Show ID from rundown selection
                const rundownSelection = event.options.rundown
                if (!rundownSelection) {
                    inst.log('error', 'Cannot play next: No rundown selected')
                    return
                }

                const rundownId = rundownSelection.substring(1) // Remove 'r' prefix
                const rundown = inst.data.rundowns[rundownId]
                // Use rundown's showId, or fallback to rundownToShowMap (authoritative from engines)
                const map = inst.data.rundownToShowMap || {}
                const showId = rundown?.showId ?? rundown?.linoEngineId ?? map[rundownId] ?? map[String(rundownId)]
                const show = inst.data.shows?.[showId]
                const channel = event.options.channel || '0'
                const channelName = channel === '1' ? 'Preview' : 'Program'

                if (!showId) {
                    inst.log('error', `Cannot play next: No Show ID for rundown ${rundownId}. Check rundownToShowMap.`)
                    return
                }

                const endpoint = `lino/rundown/${showId}/playnext/${channel}`
                inst.log('debug', `Play next → ${channelName}: showId=${showId}, rundownId=${rundownId}, endpoint=${endpoint}`)

                const response = await inst.PUT(endpoint)
                if (response === null) {
                    inst.log('warn', `Play next may have failed for: ${endpoint}`)
                } else {
                    // Refresh status immediately after successful command
                    refreshRundownItemStatus(inst, showId, rundownId)
                }
            }
        }

        // All Out: Out all items in a rundown from Program or Preview
        actions.rundownAllOut = {
            name: 'Rundown: All Out (Stop All)',
            description: 'Take out (stop) ALL items in the rundown from Program (PGM) or Preview (PVW). This is like the "Program All Out" / "Preview All Out" buttons in RealityHub UI.',
            options: rundownPlayNextOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                // Get Show ID from rundown selection
                const rundownSelection = event.options.rundown
                if (!rundownSelection) {
                    inst.log('error', 'Cannot all-out: No rundown selected')
                    return
                }

                const rundownId = rundownSelection.substring(1) // Remove 'r' prefix
                const rundown = inst.data.rundowns[rundownId]
                const map = inst.data.rundownToShowMap || {}
                const showId = rundown?.showId ?? rundown?.linoEngineId ?? map[rundownId] ?? map[String(rundownId)]
                const show = inst.data.shows?.[showId]
                const channel = event.options.channel || '0'
                const channelName = channel === '1' ? 'Preview' : 'Program'

                if (!showId) {
                    inst.log('error', `Cannot all-out: No Show ID for rundown ${rundownId}. Check rundownToShowMap.`)
                    return
                }

                if (!rundown?.items || Object.keys(rundown.items).length === 0) {
                    inst.log('warn', 'No items in rundown to out')
                    return
                }

                inst.log('info', `All Out ${channelName}: Stopping all ${Object.keys(rundown.items).length} items in "${rundown.name}"`)

                // Call out for each item in the rundown
                let successCount = 0
                let failCount = 0
                for (const itemId of Object.keys(rundown.items)) {
                    const endpoint = `lino/rundown/${showId}/out/${itemId}/${channel}`
                    try {
                        const response = await inst.PUT(endpoint)
                        if (response !== null) {
                            successCount++
                        } else {
                            failCount++
                        }
                    } catch (e) {
                        failCount++
                    }
                }

                inst.log('info', `All Out ${channelName}: ${successCount} succeeded, ${failCount} failed`)

                // Refresh status after all items processed
                if (successCount > 0) {
                    refreshRundownItemStatus(inst, showId, rundownId)
                }
            }
        }

        // Clear Output: Clear entire output channel (new in API v2.1.0)
        // This is more efficient than rundownAllOut as it's a single API call
        actions.clearOutput = {
            name: 'Rundown: Clear Output (API v2.1.0)',
            description: 'Clear the entire output channel (Program or Preview) with a single API call. More efficient than "All Out" which loops through items. Requires RealityHub 2.1.0+.',
            options: rundownPlayNextOptions(inst.data.rundowns, inst.data.rundownToShowMap, inst.data.shows),
            callback: async (event) => {
                // Get Show ID from rundown selection
                const rundownSelection = event.options.rundown
                if (!rundownSelection) {
                    inst.log('error', 'Cannot clear output: No rundown selected')
                    return
                }

                const rundownId = rundownSelection.substring(1) // Remove 'r' prefix
                const rundown = inst.data.rundowns[rundownId]
                const map = inst.data.rundownToShowMap || {}
                const showId = rundown?.showId ?? rundown?.linoEngineId ?? map[rundownId] ?? map[String(rundownId)]
                const channel = event.options.channel || '0'
                const channelName = channel === '1' ? 'Preview' : 'Program'

                if (!showId) {
                    inst.log('error', `Cannot clear output: No Show ID for rundown ${rundownId}. Check rundownToShowMap.`)
                    return
                }

                const endpoint = `lino/rundown/${showId}/clear/${channel}`
                inst.log('debug', `Clear output ${channelName}: showId=${showId}, rundownId=${rundownId}, endpoint=${endpoint}`)

                try {
                    const response = await inst.PUT(endpoint)
                    if (response !== null) {
                        inst.log('info', `Clear Output: ${channelName} cleared successfully`)
                        // Refresh status immediately after successful command
                        refreshRundownItemStatus(inst, showId, rundownId)
                    } else {
                        inst.log('warn', `Clear Output: No response from API (may still have succeeded)`)
                        // Try refresh anyway in case it succeeded
                        refreshRundownItemStatus(inst, showId, rundownId)
                    }
                } catch (e) {
                    inst.log('error', `Clear Output failed: ${e.message}`)
                }
            }
        }
    }

    // set template actions if feature selected
    if (contains(inst.config.features, 'templates') && Object.keys(inst.data.templates).length > 0) {

        actions.templateButtonPress = {
            name: 'Template: Button Press',
            description: 'Trigger any button from selected template',
            options: templateButtonOptions(inst.data.templates),
            callback: async (event) => {
                const parts = event.options[event.options.template].split('_')
                const rID = parts[0]
                const iID = parts[1]
                const bID = parts.slice(2).join('_')

                // Get the Lino engine ID associated with this template's rundown
                const rundownId = rID.substring(1)
                const template = inst.data.templates[rundownId]
                const linoEngineId = template?.linoEngineId || inst.data.linoEngineId
                if (!linoEngineId) {
                    inst.log('error', `Cannot trigger button: No Lino engine ID for template rundown ${rundownId}`)
                    return
                }

                const itemId = iID.substring(1)
                const buttonKey = bID.substring(1)
                const endpoint = `lino/rundown/${linoEngineId}/${rundownId}/items/${itemId}/buttons/${sString(buttonKey)}`

                inst.log('debug', `Triggering template button: Show ID=${linoEngineId}, Rundown=${rundownId}, Item=${itemId}, Button=${buttonKey}`)

                // Lino API: POST /api/rest/v1/lino/rundown/{engineId}/{rundownId}/items/{itemId}/buttons/{buttonKey}
                const response = await inst.POST(endpoint)
                if (response === null) {
                    inst.log('warn', `Template button trigger may have failed for: ${endpoint}`)
                }
            }
        }
    }

    // ========== LAUNCHER CONTROL ACTIONS ==========
    // These control show start/stop - always available when we have show data
    if (inst.data.shows && Object.keys(inst.data.shows).length > 0) {
        // Create show selection dropdown
        const showChoices = Object.entries(inst.data.shows).map(([showId, show]) => ({
            id: showId,
            label: `${show.name} ${show.running || show.started ? '🟢' : '⚪'}`
        }))

        const showSelectionOption = {
            type: 'dropdown',
            label: 'Show:',
            id: 'showId',
            default: showChoices[0]?.id || '',
            choices: showChoices,
            tooltip: 'Select the show to control'
        }

        // Start Show action
        actions.launchShow = {
            name: 'Launcher: Start Show',
            description: 'Start (launch) a show. This will start all Reality Engines attached to the show.',
            options: [showSelectionOption],
            callback: async (event) => {
                const showId = event.options.showId
                if (!showId) {
                    inst.log('error', 'No show selected')
                    return
                }

                const show = inst.data.shows?.[showId]
                const showName = show?.name || showId

                // Check if already running
                if (show?.running || show?.started) {
                    inst.log('warn', `Show "${showName}" is already running`)
                    return
                }

                inst.log('info', `Starting show: ${showName}`)

                // PUT /api/rest/v1/launcher/{showId}/launch
                const endpoint = `launcher/${showId}/launch`
                try {
                    const response = await inst.PUT(endpoint)
                    if (response !== null) {
                        inst.log('info', `Show "${showName}" start command sent successfully`)
                    } else {
                        inst.log('warn', `Show "${showName}" start may have failed`)
                    }
                } catch (e) {
                    inst.log('error', `Failed to start show "${showName}": ${e.message}`)
                }
            }
        }

        // Stop Show action - Double-tap confirmation for safety
        // First tap: ARM (button turns red with "TAP AGAIN!")
        // Second tap within 3s: EXECUTE stop
        // Timeout after 3s: Disarm (must start over)
        actions.stopShow = {
            name: 'Launcher: Stop Show ⚠️',
            description: '⚠️ CAUTION: Stop a running show. Requires DOUBLE-TAP confirmation: first tap arms, second tap (within 3 seconds) executes. This stops all Reality Engines attached to the show.',
            options: [showSelectionOption],
            callback: async (event) => {
                const showId = event.options.showId
                inst.log('info', `stopShow action triggered for showId: ${showId}`)

                if (!showId) {
                    inst.log('error', 'No show selected')
                    return
                }

                // Try both string and number lookups (API might return different types)
                let show = inst.data.shows?.[showId]
                if (!show && typeof showId === 'string') {
                    show = inst.data.shows?.[parseInt(showId, 10)]
                }
                if (!show && typeof showId === 'number') {
                    show = inst.data.shows?.[String(showId)]
                }

                // If show not found in cache, still allow the stop command
                // (The show might exist but our cache is stale)
                if (!show) {
                    inst.log('warn', `Show ${showId} not found in cache - proceeding with stop anyway`)
                }

                const showName = show?.name || `Show ${showId}`
                inst.log('debug', `Show status - running: ${show?.running}, started: ${show?.started}`)

                // Only skip if we KNOW the show is stopped (have data AND not running)
                if (show && !show.running && !show.started) {
                    inst.log('warn', `Show "${showName}" is already stopped`)
                    return
                }

                // Initialize armed state storage if needed
                if (!inst.data.stopArmed) {
                    inst.data.stopArmed = {}
                }

                const now = Date.now()
                const armedTime = inst.data.stopArmed[showId]
                const CONFIRM_TIMEOUT = 3000  // 3 seconds to confirm

                // Check if armed and within timeout
                if (armedTime && (now - armedTime) < CONFIRM_TIMEOUT) {
                    // ARMED and within timeout - EXECUTE STOP!
                    inst.log('warn', `⚠️ CONFIRMED - STOPPING show: ${showName}`)

                    // Clear armed state
                    delete inst.data.stopArmed[showId]
                    inst.checkFeedbacks('stopShowArmed')

                    // PUT /api/rest/v1/launcher/{showId}/stop
                    const endpoint = `launcher/${showId}/stop`
                    inst.log('info', `Calling API: PUT ${endpoint}`)
                    try {
                        const response = await inst.PUT(endpoint)
                        inst.log('debug', `Stop API response: ${JSON.stringify(response)}`)
                        if (response !== null) {
                            inst.log('info', `Show "${showName}" stop command sent successfully`)
                            // Force immediate poll to update show status
                            if (inst.pollEngines) {
                                setTimeout(() => inst.pollEngines(inst), 1000)
                            }
                        } else {
                            inst.log('warn', `Show "${showName}" stop may have failed (null response)`)
                        }
                    } catch (e) {
                        inst.log('error', `Failed to stop show "${showName}": ${e.message}`)
                    }
                } else {
                    // Not armed OR timeout expired - ARM NOW
                    inst.data.stopArmed[showId] = now
                    inst.log('warn', `🔴 ARMED to stop "${showName}" - TAP AGAIN within 3s to confirm!`)
                    inst.checkFeedbacks('stopShowArmed')

                    // Auto-disarm after timeout
                    setTimeout(() => {
                        if (inst.data.stopArmed?.[showId] === now) {
                            delete inst.data.stopArmed[showId]
                            inst.log('info', `Disarmed stop for "${showName}" (timeout)`)
                            inst.checkFeedbacks('stopShowArmed')
                        }
                    }, CONFIRM_TIMEOUT)
                }
            }
        }
    }

    return actions
}

export const getActions = createActions