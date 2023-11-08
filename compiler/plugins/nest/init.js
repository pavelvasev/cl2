import { access, constants } from 'node:fs/promises';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// todo это не install а это "загрузить модули". ибо make install он устанавливает проект в систему.
// а npm install тянет модули. но это неправильно.
export function init( state, tool ) {

	tool.add_command( "nest", () => {
		return tool.get_command("run")( path.join(__dirname,"nest.cl") )
	} )
	tool.add_command("n", tool.get_command("nest"))

	// лесом эти nest - привычнее install
	tool.add_command( "install", () => {
		return tool.get_command("run")( path.join(__dirname,"nest.cl") )
	} )
	tool.add_command("i", tool.get_command("install"))	

}
