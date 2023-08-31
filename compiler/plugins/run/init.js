import { access, constants } from 'node:fs/promises';

import {spawn} from 'node:child_process'

export function init( state, tool ) {

	tool.add_command( "run", (file="main.cl") => {

		tool.get_command("compile")( file ).then( (out_file) => {
			console.log("spawning")
			let s = spawn( "node", [out_file],{ stdio: 'inherit' })
		})

	})
	tool.add_command("r", tool.get_command("run"))
}
