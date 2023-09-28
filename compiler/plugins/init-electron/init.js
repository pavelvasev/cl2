//import { access, constants } from 'node:fs/promises';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function init( state, tool ) {
	tool.add_command( "init-electron", () => {
		//return tool.get_command("run")( path.join(__dirname,"do-init.cl") )
		let f1 = fs.cp( path.join(__dirname,"template"),".",{recursive:true,errorOnExist:true,force:false} )
		return f1.then( () => {
			return fs.readFile("README.md","utf-8").then( content => console.log(content))
		})
	} )
	//tool.add_command("i", tool.get_command("init"))
}