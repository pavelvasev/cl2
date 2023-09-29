import { access, constants } from 'node:fs/promises';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function init( state, tool ) {
	tool.add_command( "add", (ref) => {
		//return tool.eval( `import os='os' os.cp (+ @dirname 'template') '.' ` )
		return tool.get_command("run")( path.join(__dirname,"do.cl"),ref )
	} )
	//tool.add_command("i", tool.get_command("init"))
}