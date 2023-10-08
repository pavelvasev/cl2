import * as path from 'node:path';

export function get_module_dir0(r) {
			if (typeof(r) === "string") return r

			if (r.dir) return r.dir
			// todo это r.git не очень уместно тут. надо в драйвер выносить.
			// т.е. это некая частность
			if (r.git) {
				return r.git.split("/").slice(-1)[0].split(".git")[0]
			}
			return null
		}

export function get_module_dir1(r, current_dir, root_dir) {
			let dir0 = get_module_dir0( r )
			//console.log("dir0=",dir0,"r=",r)
			if (dir0 [0] == ".") { // относительно файла
				return path.join( current_dir, dir0 )
			}
			if (path.isAbsolute( dir0) ) // абсолютный путь
				return dir0
			// все остальные считаются от проекта
			// return path.join( state.dir, "modules",dir_0 )
			return path.join( root_dir, "modules",dir0 )
		}

// по спецификации рассчитывает каталог модуля
// r это спецификатор модуля из записей init.js
export function get_module_dir( r, current_dir, root_dir=current_dir ) {
	return path.resolve( get_module_dir1( r, current_dir, root_dir ))
}

// загружает конфигурацию модуля по указанному пути (папка или файл)
// пока считается что там файл init.js в папке лежит
// и дорабатывает этот конфиг, считает для него карту импорта (зачем-то)
// root_dir_path - папка проекта, F-SINGLE-MODULES-DIR
export function	load_module_config( module_path, root_dir_path=module_path ) {
		//console.log("load_module_config module_path=",module_path)

		// let dir = get_module_dir( record, current_dir ) // тут dir, path, все вперемешку короче получилось
		// console.log("resolved dir for module:",dir)

		let init_file, dir
		//console.log("load_module: ",dir)
		if (module_path.endsWith(".js") || module_path.endsWith(".mjs")) {
			init_file = module_path
			dir = path.dirname( module_path )
		}
		else {
		  init_file = path.join(module_path,"clon.mjs")
		  dir = module_path
		}

		//console.log("load_module_config: importing",init_file)
		return import( init_file ).then( m => {
			let inner_modules = m.modules || m.sources || {}

			// функция 1 - запомнить пути для карты импорта
			// todo вообще ее надо отсюда вынести. пусть эта функция только читает
			let import_map = {}
			for (let key in inner_modules) 
				import_map[key] = get_module_dir( inner_modules[key], dir, root_dir_path )

			let conf = {...m, modules: inner_modules, import_map, dir}

			return conf
		})
	}

// проект - выносим генерацию карт импорта в отдельный модуль
// module_config - загруженная конфигурация модуля. 
// содержит список источников модуля в .modules и .dir - папка модуля.	
export function generate_import_map( module_config, root_dir ) 
{

}