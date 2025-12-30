// config fields

import { Regex } from '@companion-module/base'



export const createConfigFields = [
    {
        type: 'static-text',
        id: 'info-header',
        width: 12,
        label: 'Information',
        value: 'This module connects to Zero Density RealityHub 2.1. An API key is required for authentication.',
    },
    {
        type: 'dropdown',
        id: 'protocol',
        label: 'Protocol:',
        width: 3,
        default: 'http',
        choices: [
            { id: 'http', label: 'HTTP' },
            { id: 'https', label: 'HTTPS (SSL)' },
        ],
        tooltip: 'Select HTTP or HTTPS protocol. Use HTTPS if your RealityHub server has SSL enabled.'
    },
    {
        type: 'textinput',
        id: 'host',
        label: 'IP Address:',
        width: 5,
        default: '',
        regex: Regex.IP,
        tooltip: 'Enter the IP address of your RealityHub 2.1 server'
    },
    {
        type: 'number',
        id: 'port',
        label: 'Port:',
        width: 4,
        default: 80,
        min: 1,
        max: 65535,
        step: 1,
        tooltip: 'Enter the port number (1-65535). Default is 80 for HTTP, 443 for HTTPS.'
    },
    {
        type: 'textinput',
        id: 'apiKey',
        label: 'API Key:',
        width: 6,
        default: '',
        regex: /^rh_/,
        tooltip: 'Enter your RealityHub API key (required for authentication)'
    },
    {
        type: 'multidropdown',
        id: 'features',
        label: 'Select additional Features:',
        default: [],
        choices: [
            { id: 'nodes', label: 'Nodes' },
            { id: 'rundowns', label: 'Rundowns' },
            { id: 'templates', label: 'Templates' },
        ],
        tooltip: 'Select available features. More features, especially the "Nodes" feature, can be resource intensive but will add more functionality'
    },
    {
        type: 'number',
        id: 'interval',
        label: 'Global Poll Interval (seconds):',
        width: 12,
        default: 10,
        min: 1,
        max: 600,
        required: true,
        tooltip: 'Sets the master interval (in seconds) for querying RealityHub. Lower values increase CPU usage.',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 0
    },
    {
        type: 'textinput',
        id: 'showFilter',
        label: 'Rundown Filter (Optional):',
        width: 12,
        default: '',
        tooltip: 'Enter comma-separated Rundown names to filter which rundowns are loaded. Only rundowns matching these names will appear in presets. Leave empty to load all rundowns from running shows.',
        isVisible: (options) => Array.isArray(options.features) && options.features.includes('rundowns')
    },
    {
        type: 'static-text',
        id: 'info-warning',
        width: 12,
        label: 'IMPORTANT:',
        value: 'Selecting the "Nodes" feature can increase startup time by a couple of minutes. Please wait!',
        isVisible: (options) => Array.isArray(options.features) && options.features.includes('nodes')
    },
    {
        type: 'checkbox',
        id: 'nodes0',
        width: 4,
        label: 'Auto-Update Nodes:',
        default: false,
        tooltip: 'If enabled, the module will update all nodes automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 0 && options.features[0] === 'nodes'
    },
    {
        type: 'checkbox',
        id: 'rundowns0',
        width: 4,
        label: 'Auto-Update Rundowns:',
        default: false,
        tooltip: 'If enabled, the module will update all rundowns automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 0 && options.features[0] === 'rundowns'
    },
    {
        type: 'checkbox',
        id: 'templates0',
        width: 4,
        label: 'Auto-Update Templates:',
        default: false,
        tooltip: 'If enabled, the module will update all templates automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 0 && options.features[0] === 'templates'
    },
    {
        type: 'checkbox',
        id: 'nodes1',
        width: 4,
        label: 'Auto-Update Nodes:',
        default: false,
        tooltip: 'If enabled, the module will update all nodes automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 1 && options.features[1] === 'nodes'
    },
    {
        type: 'checkbox',
        id: 'rundowns1',
        width: 4,
        label: 'Auto-Update Rundowns:',
        default: false,
        tooltip: 'If enabled, the module will update all rundowns automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 1 && options.features[1] === 'rundowns'
    },
    {
        type: 'checkbox',
        id: 'templates1',
        width: 4,
        label: 'Auto-Update Templates:',
        default: false,
        tooltip: 'If enabled, the module will update all templates automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 1 && options.features[1] === 'templates'
    },
    {
        type: 'checkbox',
        id: 'nodes2',
        width: 4,
        label: 'Auto-Update Nodes:',
        default: false,
        tooltip: 'If enabled, the module will update all nodes automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 2 && options.features[2] === 'nodes'
    },
    {
        type: 'checkbox',
        id: 'rundowns2',
        width: 4,
        label: 'Auto-Update Rundowns:',
        default: false,
        tooltip: 'If enabled, the module will update all rundowns automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 2 && options.features[2] === 'rundowns'
    },
    {
        type: 'checkbox',
        id: 'templates2',
        width: 4,
        label: 'Auto-Update Templates:',
        default: false,
        tooltip: 'If enabled, the module will update all templates automanically. This can impact performance!',
        isVisible: (options) => Array.isArray(options.features) && options.features.length > 2 && options.features[2] === 'templates'
    },
    {
        type: 'textinput',
        id: 'templatePool',
        label: 'Rundown-Name For Templates:',
        width: 12,
        default: 'CompanionTemplatesPool',
        tooltip: 'Enter a rundown name to sync RealityHub templates to it (legacy mode). Leave empty or use "*" to disable template sync and only use the Rundowns feature.',
        isVisible: (options) => Array.isArray(options.features) && options.features.includes('templates')
    },
    {
        type: 'checkbox',
        id: 'debugRequests',
        width: 8,
        label: 'Log debug information on all api requests:',
        default: false,
        tooltip: 'If enabled, the module will log all api requests!',
    }
]