export const upgradeScripts = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	
	// Migration: Add protocol and port fields for existing configurations
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		// Check if we need to upgrade the config
		if (props.config && (props.config.protocol === undefined || props.config.port === undefined)) {
			// Convert to integer and clamp to valid port range
			let port = Math.floor(Number(props.config.port)) || 80
			port = Math.max(1, Math.min(65535, port))
			
			result.updatedConfig = {
				...props.config,
				protocol: props.config.protocol || 'http',
				port: port,
			}
		}

		return result
	},
]
