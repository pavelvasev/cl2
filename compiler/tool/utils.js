import * as path from 'node:path';
import * as fs from 'node:fs/promises';

// record-спецификация модуля это то что указывается в clon.js
// это есть словарь, ключи которого имена пакетов для таблицы импортов
// а значения - определяют откуда брать эти модули.

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

export function get_module_dir1(r, current_dir, modules_root_dir) {
			let dir0 = get_module_dir0( r )
			//console.log("dir0=",dir0,"r=",r)
			if (dir0 [0] == ".") { // относительно файла
				return path.join( current_dir, dir0 )
			}
			if (path.isAbsolute( dir0) ) // абсолютный путь
				return dir0
			// все остальные считаются от проекта
			// return path.join( state.dir, "modules",dir_0 )
			// F-SINGLE-MODULES-DIR
			return path.join( modules_root_dir,dir0 )
		}

// по спецификации рассчитывает каталог модуля
// r это спецификатор модуля из записей init.js
// current_dir это "текущая папка" для расчета относительных путей
// modules_root_dir это папка модулей проекта, F-SINGLE-MODULES-DIR
export function get_module_dir( r, current_dir, modules_root_dir=current_dir ) {
	return path.resolve( get_module_dir1( r, current_dir, modules_root_dir ))
}

// загружает конфигурацию модуля по указанному пути (папка или файл) module_path
// пока считается что там файл init.js в папке лежит
// и дорабатывает этот конфиг, считает для него карту импорта (зачем-то)
// modules_root_dir - папка модулей проекта, F-SINGLE-MODULES-DIR
// include_package_json - надо ли добавлять пакеты из package.json
// потому что при слон инсталл - их не надо добавлять. (а то он пытается их ставить)
export function	load_module_config( module_path, modules_root_dir, include_package_json=true ) {
	    
		//console.log("load_module_config module_path=",module_path)

		// let dir = get_module_dir( record, current_dir ) // тут dir, path, все вперемешку короче получилось
		// console.log("resolved dir for module:",dir)

		let init_file, dir

		//console.log("load_module: module_path=",module_path,"modules_root_dir=",modules_root_dir)

		if (module_path.endsWith(".js") || module_path.endsWith(".mjs")) {
			init_file = module_path
			dir = path.dirname( module_path )
		}
		else {
		  init_file = path.join(module_path,"clon.mjs")
		  dir = module_path
		}

		// если папка модулей проекта не задана, то это считается папка
		//if (!modules_root_dir) console.log("modules_root_dir not specified! computing.")
		//modules_root_dir ||= path.join( dir, "modules" )


		// F-PACKAGE-JSON
		// "вычислим" модули из package.json
		// вообще это надо убрать в отдельную функцию. и вызывать отдельно.
		// т.к. load_module_config вызывается только из cl-tool и nest, а надо только для cl-tool
		let package_json_modules_p
		if (include_package_json) {

			let p = path.join(dir,"package.json")
			package_json_modules_p = fs.access(p, fs.constants.R_OK).then( () => {
			    // получается логика такая - если есть package.json
		    	// то работаем с ним..
		    	modules_root_dir ||= path.join( dir, "node_modules" )					    

				//console.log("OK file exist")
				return fs.readFile(p).then( content => {
					const info = JSON.parse(content);
					let keys = info.dependencies || {}
					let xtra = Object.keys(keys).reduce( (acc,name) => {
					  if (name.endsWith(".cl")) {
					    //let short_name = name.split(".cl")[0]
					    let short_name = name;
					    acc[short_name]={dir:name}
					    //acc[short_name]={dir:`./node_modules/${name}`}
					    //acc[short_name] = `./node_modules/${name}`
					  }
					  return acc
					},{})
					return xtra
				})				
			}).catch( () => {} )
		} else {
			package_json_modules_p = Promise.resolve({})			
		}

		//console.log("load_module_config: importing",init_file)
		return package_json_modules_p.then( package_json_modules => {

			modules_root_dir ||= path.join( dir, "modules" )

			 return import( init_file ).then( m => {
				let inner_modules = m.modules || m.sources || {}

				inner_modules = {...inner_modules,...package_json_modules}
				// F-MODULES-DIR
				//console.log("loaded",init_file)
				//console.log("pt modules_root_dir=",modules_root_dir, "m.modules_dir=",m.modules_dir)
				let modules_dir = m.modules_dir ? path.resolve( dir, m.modules_dir ) : modules_root_dir
				//console.log("   thus modules_dir=",modules_dir)

				// функция 1 - запомнить пути для карты импорта
				// todo вообще ее надо отсюда вынести. пусть эта функция только читает
				let import_map = {}
				for (let key in inner_modules) 
					import_map[key] = get_module_dir( inner_modules[key], dir, modules_dir )

				let conf = {...m, modules: inner_modules, import_map, dir, modules_dir}

				return conf
			})
		})
	}

// проект - выносим генерацию карт импорта в отдельный модуль
// module_config - загруженная конфигурация модуля. 
// содержит список источников модуля в .modules и .dir - папка модуля.	
export function generate_import_map( module_config, root_dir ) 
{

}