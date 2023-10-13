#!/bin/env -S node --stack_trace_limit=200

// пример запуска: ./cl-tool.js 1.cl

// модули загружаемые по умолчанию
let default_modules = [
	"forms/forms.js",
	"compute/compute.js",
	"bundle-2/bundle-2.js",
	"module-path/module-path.js",
	"macros/macros.js",
	"../../stdlib/init.js",
	"defaults/init.js",	
	"compile/init.js",
	"run/init.js","test/init.js",
	"nest/init.js", 
	"init/init.js", "init-web/init.js", "init-electron/init.js",
	"watch", "add"
	]

// командной строки компилятор
import './node-fetch-fix.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as C from "../lib/cl2-compiler.js"
import * as U from "./utils.js"

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let DEFAULT_PLUGINS_DIR = path.resolve( path.join( __dirname,"..","plugins") )
let CLON_DIR = path.resolve( path.join( __dirname,"..","..") )

		
//////////////////////////////////////		

class Tool {

	clon_dir=CLON_DIR

	constructor( state ) {
		//this.state = state
		// будем запихивать?
	}

  // загружает init.js-файлы по списку спецификаторов указанных в arr
  // dir - массив путей, где каждый путь это каталог или файл .js
	load_modules( arr, state, current_dir="", root_dir ) {
		//console.log("load_modules: ",arr)
		if (arr.length == 0) return Promise.resolve(true)
		try {
			let next = this.load_module( arr[0], state, current_dir,root_dir )
			return next.then( (result) => {
				return this.load_modules( arr.slice(1), state, current_dir,root_dir )
			})
		} catch (err) {			
			console.error("load_modules: error loading module",arr[0])
			throw err
		}
	}

	// список промис
	loaded_modules = {}
	// загружает 1 модуль находящийся в указанной папке
	// папка указывается через record - спецификацию модуля
	load_module( record, state, current_dir="", root_dir ) {

		let dir = U.get_module_dir( record, current_dir, root_dir )
		//console.log("\nload_module, path=",dir,"current_dir=",current_dir)
		//console.trace()
		
		this.loaded_modules[dir] ||= U.load_module_config( dir, root_dir ).then( conf => {
			state.modules_conf[ dir ] = conf
			// 1 загрузим под-модули этого модуля
			// 2 передадим управление на инициализацию этого модуля

			return this.load_modules( Object.values(conf.modules), state, conf.dir,root_dir ).then( () => {
				return Promise.resolve( conf.init ? conf.init( state, this ) : true ).then( () => conf)
			})
		})

		return this.loaded_modules[dir]
	}

	// надо трансформерам
	parse( str ) {
		return C.code2obj( str )
	}

	compile_string( str, state )
	{
		let dump = C.code2obj( str )
		//console.log( JSON.stringify(dump,null,'  '))
		let jsarr = C.objs2js( dump,state )
		let js = C.strarr2str( jsarr )
		return js
	}

	// file это путь к файлу
	compile_file( file, state ) 
	{
			let content = fs.readFileSync( file ,{ encoding: 'utf8', flag: 'r' });

		  let module_state = C.modify_dir( state, path.dirname( file ) + "/")
		  // мы вызываем это objs2js чтобы наполнить module_state определениями из прочитанного кода
			let code = this.compile_string( content, module_state )

			return {code,state:module_state}
	}

	compile_file_p( file, state ) 
	{
		let file_p = "file://" + file
		return fetch( file_p ).then( r => r.text() ).then( content => {
			//console.log(333,"state.env=",state.env)
			//console.log("compile_file_p", file,path.dirname( file ))
		  let module_state = C.modify_dir( state, path.dirname( file ) + "/")
		  // мы вызываем это objs2js чтобы наполнить module_state определениями из прочитанного кода
			let code = this.compile_string( content, module_state )
			return {code,state:module_state}			
		})
	}	

	global_code = []

	// добавляет код к кодогенерации
  // каждый элемент code - строчка, массив строчек, массив массивов..
	add_global_code( ...code) {
			this.global_code.push( ...code )
	}
	prepend_global_code( ...code ) {
		this.global_code.unshift( ...code )
	}
	get_global_code() {
		return C.strarr2str( this.global_code )
	}

	gen_full_code( code ) {
		//return `import * as CL2 from 'clon-lang'\nlet self={};\n${this.get_global_code()}\n${code}`
		return `// Программа сгенерирована clon-lang -- https://github.com/pavelvasev/clon-lang\nlet self={};\n${this.get_global_code()}\n${code}`
	}

	commands = {}

	add_command( name, fn ) {
		this.commands[name] = fn
	}
	get_command( name ) {
		if (!this.commands[name])
			throw new Error("tool: command not found! "+name)
		return this.commands[name]
	}

	config = {}

	get_config_modules() {
		return this.config?.modules || {}
		// modules набор записей вида { "id" => record } 
		// где record запись вида "dir" пока что а потом добавим например src для гита
	}
	get_module_dir( rec ) {
		let dir = rec
		// todo вычислять dir из имени каталога на github и т.п.
		return dir
	}

}

///////////////////////////////////////////

let tool = new Tool()
let state = C.create_state()
state.tool = tool

//let modules_to_import = default_modules.map( x => path.join(DEFAULT_PLUGINS_DIR,x)
let mmm = tool.load_modules( default_modules.map( x => path.join(DEFAULT_PLUGINS_DIR,x) ), state)

// уже прочитанные модули
let imported_modules = {} // abs-path => state

// todo идея мб не import name="id" а таки import name=@id т.е. модули вводить как ячейки?..
state.env["import"] = {
	make_code: function( obj, state ) {
		let promarr = []
		let strs = []
		let outers = []
		for (let tgt in obj.params) {
			let src = obj.params[tgt]
			//console.log("using",src,"as ",tgt)

			if (state.current[tgt])
				throw new Error(`import: cannot import to name '${tgt}', it already busy in current env`)

			//let file = path.resolve( path.join(state.dir,src) )
			
			let file = null
			// F-NODE-IMPORT F-JS-IMPORT
			if (src.startsWith("node:")) file = src
				else
			if (src.startsWith("js:")) file = src.slice(3)
			else
			   file = state.space.resolve_module_path( src, state )

			let module_state = imported_modules[ file ]

			// мы с ним уже разобрались?
			if (!module_state) {
				//console.log("file->",src)
				// жесточайший хак. 1 надо начинать это еще в resolve_module_path, 2 это вообще цепочка обработки импорта, надо ее формализовать
				// F-NODE-IMPORT F-JS-IMPORT
				if (file.endsWith(".js") || file.startsWith("node:") || src.startsWith("js:")) { 
					if (src.startsWith("js:"))
						src = file
					//global_prefix.push( state.space.register_import_outer(src, file) )
					tool.add_global_code( state.space.register_import_outer(src, file) )
				}
				else {

					// пока так...
					let content = fs.readFileSync( file ,{ encoding: 'utf8', flag: 'r' });

				  module_state = C.modify_dir( state, path.dirname( file ) + "/")

				  // надо забыть о внешнем.. новый мир тут.
				  module_state = C.modify_parent( module_state,"self",null )
				  // переменная self добавляется в bundle-2 register_import

				  module_state.import_map = state.space.resolve_module_import_map( src, state )

				  // и todo - надо карту импортов свою им подгрузить
				  // мы вызываем это objs2js чтобы наполнить module_state определениями из прочитанного кода
					let code = tool.compile_string( content, module_state )
					
					imported_modules[ file ] = module_state

					//strs.push(`import * as ${tgt} from '${js_import_path}'`)
					//strs.push( state.space.register_import( tgt, file, module_state,code ) )
					// это выстраивает коды линейно
					tool.add_global_code( state.space.register_import( tgt, file, module_state,code ) )
			  }
			}

			state.current[tgt] = module_state
			strs.push( state.space.register_import_use( tgt, file, module_state ) )
		}
		return { main: strs, bindings: [], prefix: outers }
  },
	check_params: () => {}
}


//////////////// ну поехали

let command = process.argv[2] || "compile"

// F-FIX-PATH надо добавить путь к текущему clon-установке чтобы стала доступны утилита clon
// именно этой установки. это используется сейчас в run-tests.
// хотя быть может на будущее проще говорить что-то вроде npm exec clon?
process.env.PATH = [CLON_DIR].concat( process.env.PATH.split(path.delimiter) ).join(path.delimiter);

mmm.then( () => {
	tool.get_command(command).apply( this, [...process.argv].slice(3) )	
})