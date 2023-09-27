import { access, constants } from 'node:fs/promises';

import {spawn} from 'node:child_process'

export function init( state, tool ) {

	tool.add_command( "run", (file="main.cl") => {

		// todo сделать компиляцию с учетом времен файлов
		tool.get_command("compile")( file ).then( (out_file) => {
			console.log("spawning")
			let node_path = process.execPath // "node"
			//console.log("inspect!")
			setTimeout( () => {
			let s = spawn( node_path, [out_file],{ stdio: 'inherit' })
			// также можно запускать через import...
			s.on('exit',(code) => {
				process.exit(code)
			})
			},1)
		})

	})
	tool.add_command("r", tool.get_command("run"))
}
