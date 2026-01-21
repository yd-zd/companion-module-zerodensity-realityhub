// index

import { InstanceBase, runEntrypoint } from '@companion-module/base'
import got from 'got'
import { upgradeScripts } from './upgrades.js'
import { createConfigFields } from './configFields.js'
import { getActions } from './actions.js'
import { getFeedbacks } from './feedbacks.js'
import { getVariables } from './variables.js'
import { getPresets } from './presets.js'
import { loadEngines } from './features/engines.js'
import { loadNodes } from './features/nodes.js'
import { loadRundowns } from './features/rundowns.js'
import { loadTemplates } from './features/templates.js'
import { SLEEP, contains, defaultTimer, variableExecutor } from './tools.js'
import { cueExecutor } from './cueExecutor.js'



class RealityHubInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// set request timeouts
		this.requestTimeout = {
			lookup: 1000,
			connect: 1000,
			secureConnect: 1000,
			socket: 1000,
			send: 1000,
			response: 1000
		}

		this.requestErrors = 0
		this.requestErrorThreshold = 10

		this.lastRequest = 0
		this.enableRequests = false
		this.connectionEstablished = false
		this.moduleInitiated = false
		this.initFunctionality = false // set to 'false' to indicate no actions, feedbacks etc. are defined

		// create feature variables
		this.pollEngines = loadEngines
		this.pollNodes = loadNodes
		this.pollRundowns = loadRundowns
		this.pollTemplates = loadTemplates

		this.updateVariables = (variables) => {
			Object.entries(variables).forEach(([variable, value]) => {
				this.executors.variables.append(variable, value)
			})
		}

		this.retryTimer = undefined

		// create empty config object
		this.config = {}

		// create object to track errors
		this.errors = {
			last: {},
			log: true
		}

		// create data object to store data from reality hub
		this.data = {
			engines: {},        // Reality Engines (physical machines)
			shows: {},          // Shows (logical groupings that control engines)
			rundowns: {},       // Rundowns loaded on running shows
			templates: {},
			nodes: {},
			linoEngines: {},    // Backward compatibility (same as shows)
			rundownToShowMap: {}, // Maps rundownId -> showId for button triggers
			primaryShowId: null,  // First running show
			linoEngineId: null,   // Backward compatibility (same as primaryShowId)
			module: {
				updateEnginesData: false,
				updateEnginesDuration: 0,
				updateEnginesProgress: 0,
				updateRundownsData: false,
				updateRundownsDuration: 0,
				updateRundownsProgress: 0,
				updateTemplatesData: false,
				updateTemplatesDuration: 0,
				updateTemplatesProgress: 0,
				updateNodesData: false,
				updateNodesDuration: 0,
				updateNodesProgress: 0,

				// Cache Timestamps
				lastRundownUpdate: 0,
				lastNodesUpdate: 0,
				lastTemplatesUpdate: 0,

				inputNodeMappings: {},
				feedbackRequestActive: {},
			},
			timer: {
				updateEngines: new defaultTimer(() => {
					if (this.data.module.updateEnginesData === false) this.pollEngines(this)
				}, this)
			}
		}

		// create executors
		this.executors = {
			variables: new variableExecutor(this),
			requests: new cueExecutor(['high', 'medium', 'low'])
		}
	}

	// handle module shutdown
	async destroy() {
		this.enableRequests = false
		this.moduleInitiated = false

		this.data.timer.updateEngines.stop()
		this.executors.variables.stop()
		this.executors.requests.block()
		await SLEEP(1000)
		this.executors.requests.clear()
	}

	// create config fields
	getConfigFields = () => createConfigFields

	// run "configUpdated()" when module gets enabled
	init = async (config) => this.configUpdated(config)

	async initModule(fastInit = false) {
		// request "engines" data to check connection to host
		let connectionSuccess = false
		try {
			const response = await this.GET('engines')
			connectionSuccess = response !== null
		} catch (error) {
			this.log('debug', `Connection error: ${error.message}`)
			connectionSuccess = false
		}

		if (!connectionSuccess) {
			const retryDelay = 10
			this.moduleInitiated = false
			// Use 'disconnected' status - this is non-blocking and allows config editing
			this.updateStatus('disconnected', `Cannot reach ${this.getBaseUrl()}`)
			this.log('info', `Connection failed to ${this.getBaseUrl()}`)
			this.log('debug', `Retry connection in ${retryDelay}s`)

			// return if the module already retries
			if (this.retryTimer !== undefined) return

			// create retry timer (non-blocking)
			this.retryTimer = setTimeout(() => {
				// return if connection is established now
				if (this.connectionEstablished === true) return

				// clear retry timer
				clearTimeout(this.retryTimer)
				this.retryTimer = undefined

				// run "configUpdated()" to try new connection
				this.configUpdated(this.config, true)
			}, retryDelay * 1000)
			return
		}

		// start variable updater
		this.executors.variables.start(100)

		this.log('info', 'Connection succeeded!')
		this.connectionEstablished = true
		this.outputErrors = true

		this.data.module.updateEnginesProgress = 0
		this.data.module.updateEnginesDuration = 0
		this.data.module.updateNodesProgress = 0
		this.data.module.updateNodesDuration = 0
		this.data.module.updateRundownsProgress = 0
		this.data.module.updateRundownsDuration = 0
		this.data.module.updateTemplatesProgress = 0
		this.data.module.updateTemplatesDuration = 0

		if (this.enableRequests !== true) return

		this.updateStatus('LOAD: Engines data ...')
		this.log('info', 'Load engines data...')
		await this.pollEngines(this) // request engines data
		this.log('info', `${Object.keys(this.data.engines).length} engines found!`)

		// set action definitions
		this.setActionDefinitions(getActions(this))

		// set feedback definitions
		this.setFeedbackDefinitions(getFeedbacks(this))

		// update feedbacks
		this.checkFeedbacks()

		// get variable definitions and values
		const [def, val] = getVariables(this)

		// set variable definitions
		this.setVariableDefinitions(def)

		// set variable values
		this.setVariableValues(val)

		// set preset definitions
		this.setPresetDefinitions(getPresets(this))

		// check if rundowns feature is selected in config
		if (contains(this.config.features, 'rundowns') && this.enableRequests === true && fastInit === false) {
			this.updateStatus('LOAD: Rundowns data ...', '0%')
			this.log('info', 'Load rundowns data...')
			await this.pollRundowns(this) // request rundowns data
			this.log('info', `${Object.keys(this.data.rundowns).length} rundowns found!`)
		}

		// check if templates feature is selected in config
		if (contains(this.config.features, 'templates') && this.enableRequests === true && fastInit === false) {
			this.updateStatus('LOAD: Templates data ...', '0%')
			this.log('info', 'Load templates data...')
			await this.pollTemplates(this) // request templates data
			const templateValues = Object.values(this.data.templates)
			const templateCount = templateValues.length > 0 && templateValues[0]?.items
				? Object.keys(templateValues[0].items).length
				: 0
			this.log('info', `${templateCount} templates found!`)
		}

		// check if nodes feature is selected in config
		if (contains(this.config.features, 'nodes') && this.enableRequests === true && fastInit === false) {
			this.updateStatus('LOAD: Nodes data ...', '0%')
			this.log('info', 'Load nodes data...')
			await this.pollNodes(this) // request nodes data
			let allNodes = 0
			for (const nodes of Object.values(this.data.nodes)) allNodes += Object.keys(nodes).length
			this.log('info', `${allNodes} nodes found!`)
		}

		if (this.enableRequests !== true) return

		this.moduleInitiated = true
		this.updateStatus('ok')
		this.log('info', 'Instance ready to use!')

		this.autoUpdater()
	}

	async autoUpdater() {
		// start engines timer (Master Timer)
		// This will trigger other updates (rundowns, nodes, etc.) sequentially
		const interval = (this.config?.interval || 10) * 1000
		this.data.timer.updateEngines.start(interval)

		this.log('debug', `Auto updater started with interval of ${interval}ms`)
	}

	// handle errors (non-blocking)
	async errorModule(error = 'unknown error', subject = 'unknown subject') {
		if (this.requestErrorThreshold > this.requestErrors) return

		// log new errors
		if (this.errors.last.error !== error && this.errors.last.subject !== subject) {
			this.errors.last = { error: error, subject: subject }
			this.log('error', `${error} for "${subject}"`)
			// Use non-blocking status values
			if (error === 'TimeoutError') {
				this.updateStatus('connection_failure', 'Connection timeout')
			} else if (error === 'Unauthorized' || error === 'Forbidden') {
				this.updateStatus('bad_config', `API Key issue: ${error}`)
			} else {
				this.updateStatus('unknown_error', error)
			}
		}

		// clear request cue if request errors occur
		if (['RequestError', 'TimeoutError'].includes(error)) {
			this.executors.requests.clear()
			this.connectionEstablished = false

			try {
				if (await this.GET('engines') !== null) this.initModule()
			} catch (e) {
				this.log('debug', `Reconnection attempt failed: ${e.message}`)
			}
		}
	}

	// update config and try to connect to init module (non-blocking)
	async configUpdated(config, retry = false) {
		// Safety check: ensure config object exists
		if (!config) {
			this.updateStatus('bad_config', 'No configuration provided')
			this.log('debug', 'No configuration provided yet')
			return
		}

		// Check for valid IP address (must be provided and look like an IP)
		const host = config.host || ''
		if (!host || host.split('.').length !== 4) {
			this.updateStatus('bad_config', 'Enter IP address')
			this.log('debug', 'Waiting for valid RealityHub IP address')
			return
		}

		// Check for valid API key (must be provided and start with "rh_")
		const apiKey = config.apiKey || ''
		if (!apiKey || apiKey.trim() === '') {
			this.updateStatus('bad_config', 'Enter API key')
			this.log('debug', 'Waiting for valid RealityHub API key')
			return
		}
		if (!/^rh_/.test(apiKey.trim())) {
			this.updateStatus('bad_config', 'Invalid API key')
			this.log('debug', 'Invalid API key format')
			return
		}

		// Check for valid template pool name if templates feature is enabled
		const features = config.features || []
		if (contains(features, 'templates') && !config.templatePool) {
			this.updateStatus('bad_config', 'Template pool name required')
			this.log('debug', 'Waiting for template pool name')
			return
		}

		let featuresChanged = false
		if (this.config.features === undefined) this.config.features = []
		for (const feature of features) if (!this.config.features.includes(feature)) featuresChanged = true
		for (const feature of this.config.features) if (!features.includes(feature)) featuresChanged = true

		// Detect rundown filter change (for immediate reload)
		const filterChanged = this.config.showFilter !== config.showFilter

		await this.destroy()
		this.executors.requests.unblock()

		// reconnect, if host, protocol or port changed
		const connectionChanged = this.config.host !== config.host ||
			this.config.protocol !== config.protocol ||
			this.config.port !== config.port
		if (connectionChanged || retry === true || featuresChanged === true) {
			// update config variable
			this.config = config
			this.errors.last = {}

			this.updateStatus('connecting')
			this.log('info', `Connecting to ${this.getBaseUrl()}...`)

			this.enableRequests = true
			this.moduleInitiated = false
			// Non-blocking connection attempt
			this.initModule().catch(err => {
				this.log('error', `Init error: ${err.message}`)
				this.updateStatus('connection_failure', 'Init failed')
			})
		}
		// check if module can be initiated without reconnecting
		else if (this.connectionEstablished) {
			// update config variable
			this.config = config

			this.enableRequests = true
			this.initModule(true).catch(err => {
				this.log('error', `Re-init error: ${err.message}`)
				this.updateStatus('connection_failure', 'Re-init failed')
			})

			// If rundown filter changed, trigger immediate rundown reload
			if (filterChanged && contains(features, 'rundowns')) {
				this.log('info', `Rundown filter changed to: "${config.showFilter || '(none)'}". Reloading rundowns...`)
				this.data.module.lastRundownUpdate = 0 // Force update
				// IMPORTANT: Clear existing rundowns to apply filter fresh
				// (Merge strategy would otherwise preserve old unfiltered data)
				this.data.rundowns = {}
				this.pollRundowns(this).then(() => {
					// Refresh UI with new filtered data
					this.setActionDefinitions(getActions(this))
					this.setPresetDefinitions(getPresets(this))
					this.checkFeedbacks()
					this.log('info', 'Rundown filter applied successfully')
				}).catch(err => {
					this.log('error', `Failed to reload rundowns: ${err.message}`)
				})
			}
		}
	}

	async REQ(method, url, body, channel) {
		// return null if requests are not allowed
		if (this.enableRequests !== true) return null

		// create request parameters object
		const parameters = {
			responseType: 'json',
			timeout: this.requestTimeout,
			headers: {}
		}

		// add API key header if configured (for RealityHub 2.1+)
		if (this.config.apiKey && this.config.apiKey.trim() !== '') {
			parameters.headers['X-API-Key'] = this.config.apiKey.trim()
		}

		// add body to "parameters" object if not empty
		if (Object.keys(body).length > 0) parameters.json = body

		let response = null

		try {
			// Handle requests based on method
			// Note: POST/PUT/DELETE often return 204 No Content or empty bodies
			// We gracefully handle ParseError for these command methods
			if (method === 'GET') {
				response = await got.get(url, parameters).json()
			}
			else if (method === 'POST') {
				// POST (button triggers, function calls) may return empty body
				try {
					response = await got.post(url, parameters).json()
				} catch (jsonError) {
					if (jsonError.name === 'ParseError') {
						// Empty body is OK for command endpoints - treat as success
						response = { success: true }
					} else {
						throw jsonError
					}
				}
			}
			else if (method === 'PATCH') {
				response = await got.patch(url, parameters).json()
			}
			else if (method === 'PUT') {
				// PUT (play/out/continue commands) may return empty body
				try {
					response = await got.put(url, parameters).json()
				} catch (jsonError) {
					if (jsonError.name === 'ParseError') {
						// Empty body is OK for command endpoints - treat as success
						response = { success: true }
					} else {
						throw jsonError
					}
				}
			}
			else if (method === 'DELETE') {
				// DELETE may also return empty body
				try {
					response = await got.delete(url, parameters).json()
				} catch (jsonError) {
					if (jsonError.name === 'ParseError') {
						response = { success: true }
					} else {
						throw jsonError
					}
				}
			}

			this.requestErrors = 0
		}
		catch (error) {
			this.requestErrors++
			// Enhanced error handling for API key issues
			if (error.response?.statusCode === 401) {
				this.log('error', 'Authentication failed! Please check your API key.')
				this.errorModule('Unauthorized', error.options?.url || url)
			} else if (error.response?.statusCode === 403) {
				this.log('error', 'Access forbidden! API key may be invalid or expired.')
				this.errorModule('Forbidden', error.options?.url || url)
			} else {
				this.errorModule(error.name, error.options?.url || url)
			}
		}
		finally {
			// log request debug message if enabled
			if (this.config.debugRequests === true) {
				this.log('debug', `${method} request "${url}"`)
			}

			// return null if requests are not allowed
			if (this.enableRequests !== true) return null

			// return response
			return response
		}
	}

	// Helper to build base URL with protocol and port
	getBaseUrl = () => {
		const protocol = this.config.protocol || 'http'
		const host = this.config.host
		// Ensure port is a valid integer between 1-65535
		let port = Math.floor(Number(this.config.port)) || 80
		port = Math.max(1, Math.min(65535, port))

		// Include port in URL only if it's not the default for the protocol
		const includePort = !(
			(protocol === 'http' && port === 80) ||
			(protocol === 'https' && port === 443)
		)

		return `${protocol}://${host}${includePort ? ':' + port : ''}/api/rest/v1`
	}

	GET = async (endpoint, body = {}, importance = 'high') => this.REQ('GET', `${this.getBaseUrl()}/${endpoint}`, body, importance)
	POST = async (endpoint, body = {}, importance = 'high') => this.REQ('POST', `${this.getBaseUrl()}/${endpoint}`, body, importance)
	PATCH = async (endpoint, body = {}, importance = 'high') => this.REQ('PATCH', `${this.getBaseUrl()}/${endpoint}`, body, importance)
	PUT = async (endpoint, body = {}, importance = 'high') => this.REQ('PUT', `${this.getBaseUrl()}/${endpoint}`, body, importance)
	DELETE = async (endpoint, body = {}, importance = 'high') => this.REQ('DELETE', `${this.getBaseUrl()}/${endpoint}`, body, importance)
}

runEntrypoint(RealityHubInstance, upgradeScripts)