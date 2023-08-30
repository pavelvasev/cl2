import { access, constants } from 'node:fs/promises';

export function init( state, tool ) {
	let config_file = process.cwd() + "/config.js"

	return access(config_file, constants.R_OK).then( () => {
		return import( config_file ).then( m => {
			state.config = m
			console.log("config.js is exist. thus state.config=",state.config)
		})
	}).catch( err => {		
		console.log("config.js is missing. ok.")
		state.config = {modules:{}}
		return true
	})
}
