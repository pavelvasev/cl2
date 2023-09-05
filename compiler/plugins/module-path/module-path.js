// F-MODULE-PATHS

export function init( state )
{
	state.space.resolve_module_path = resolve_module_path
}


import * as path from 'node:path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let STDLIBS = path.resolve( path.join( __dirname,"..","..","..","lib" ))
let import_mapa = {
	"std" : STDLIBS	
}

// функция которая по айди модуля и состоянию выдает полный путь к файлу модуля который надо грузить
// id, state -> full-path
// F-MODULE-PATHS
function resolve_module_path( src_id, state ) {
	let parts = src_id.split("/")
	let first = parts.shift()
	// F-IMPORT-RELATIVE
	if (first == ".") // текущий каталог
	{
		//console.log("qqqq", state.dir, src_id)
		return path.resolve( path.join(state.dir,src_id) )
	}
	let basedir_or_file = import_mapa[ first ]
	let import_map = {}
	if (!basedir_or_file) {
		// F-IMPORT-MAP
		let r2 = state.import_map[ first ]
		if (!r2) 
			throw new Error(`resolve_module: cannot find module for id ${src_id}`)
		basedir_or_file = r2.dir
		import_map = r2.import_map
	}

	return { path: path.resolve( path.join(basedir_or_file, parts.join("/") ) ), import_map }
}