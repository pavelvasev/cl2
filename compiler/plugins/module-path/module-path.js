// F-MODULE-PATHS

export function init( state, tool, options )
{
	state.space.resolve_module_path = resolve_module_path
	state.space.resolve_module_import_map = resolve_module_import_map

	state.default_import_map = {}
}

import * as path from 'node:path';

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
	if (first == "..") // относительный каталог каталог
	{
		//console.log("qqqq", state.dir, src_id)
		return path.resolve( path.join(state.dir,src_id) )
	}
	if (first == "http:" || first == "https:")
		return src_id

	let basedir_or_file = state.default_import_map[ first ]
	let import_map = {}
	if (!basedir_or_file) {
		// F-IMPORT-MAP
		let r2 = state.import_map[ first ]
		if (!r2) {
			console.log("state.import_map=",state.import_map)
			throw new Error(`resolve_module: cannot find module for id ${src_id}`)
		}
		basedir_or_file = r2
	}

	// F-MODULE-MAIN-CL если в импорте указать только имя модуля, то загружать main.cl этого модуля
	if (parts.length == 0)
		parts.push( "main.cl")

	return path.resolve( path.join(basedir_or_file, parts.join("/") ) )
}

function resolve_module_import_map( src_id, state ) {
	
	let parts = src_id.split("/")
	let first = parts.shift()
	// F-IMPORT-RELATIVE
	if (first == ".") // текущий каталог
	{
		return state.import_map
	}
	let found_dir = state.import_map[ first ]
	if (!found_dir) 
		return null
		//throw new Error(`resolve_module_import_map: cannot find module for id ${src_id}`)
	let module_conf = state.modules_conf[ found_dir ]
	if (!module_conf)
		throw new Error(`resolve_module_import_map: cannot find dir info id ${src_id} dir ${found_dir}`)
	return state.modules_conf[ found_dir ].import_map
}