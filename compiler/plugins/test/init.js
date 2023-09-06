import { access, constants } from 'node:fs/promises';
import {spawn} from 'node:child_process'
import * as path from 'node:path';

export function init( state, tool ) {

	tool.add_command( "test", (file="main.cl") => {

		tool.get_command("compile")( file ).then( (out_file) => {
			console.log("importing")
			//let s = spawn( "node", [out_file],{ stdio: 'inherit' })
			let file_path = path.join( process.cwd(), out_file )
			/*
			let orig = console.log
			let save = []
			console.log = (...vals) => {
				orig(...vals)
				save.push( vals.toString() )
			}
			*/
			let save = ""

			import( file_path ).then(k => {
				console.log("imported. starting test.")

				var unhook = hook_stdout(function(string, encoding, fd) {
    				//util.debug('stdout: ' + util.inspect(string))
    				//save.push( string )
    				save = save + string
				})

				k.test( () => save )
			})
		})

	})
	tool.add_command("t", tool.get_command("test"))
}

// https://gist.github.com/pguillory/729616
function hook_stdout(callback) {
    var old_write = process.stdout.write

    process.stdout.write = (function(write) {
        return function(string, encoding, fd) {
            write.apply(process.stdout, arguments)
            callback(string, encoding, fd)
        }
    })(process.stdout.write)

    return function() {
        process.stdout.write = old_write
    }
}
