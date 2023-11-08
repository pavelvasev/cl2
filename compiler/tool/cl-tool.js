#!/bin/env -S node --stack_trace_limit=200

// пример запуска: ./cl-tool.js 1.cl

// модули загружаемые по умолчанию
let default_modules = [
	"module-path/module-path.js",	
	"test/init.js",
	"nest/init.js",
	"init/init.js", "init-web/init.js", "init-electron/init.js",
	"watch", "add",
	"macros/macros.js"
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
let COMMON_PLUGINS_DIR = path.resolve( path.join( __dirname,"..","plugins") )
let PLATFORMS_DIR = path.resolve( path.join( __dirname,"..","..","platform") )
let CLON_DIR = path.resolve( path.join( __dirname,"..","..") )

		
//////////////////////////////////////		

class Tool {

	clon_dir=CLON_DIR
	common_plugins_dir = COMMON_PLUGINS_DIR
	platform_dir = null // позже напишут

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
	load_module( record, state, current_dir="", modules_root_dir ) {

		// тут какая-то легкая несостыковка по root_dir, но вроде работает
		let dir = U.get_module_dir( record, current_dir, modules_root_dir )		
		//console.log("\nload_module, path=",dir,"current_dir=",current_dir,"root_dir=",root_dir)
		//console.trace()
		//console.trace()
		
		this.loaded_modules[dir] ||= U.load_module_config( dir, modules_root_dir ).then( conf => {
			state.modules_conf[ dir ] = conf
			// 1 загрузим под-модули этого модуля
			// 2 передадим управление на инициализацию этого модуля

			// F-MODULES-DIR
			return this.load_modules( Object.values(conf.modules), state, conf.dir, conf.modules_dir ).then( () => {
				// фича - передаем conf в инит-процедуру указанного модуля
				// так она сможет узнать текущий каталог. хотя.. а в стейте что ли нету?
				// есть но пустое.. ех 
				return Promise.resolve( conf.init ? conf.init( state, this, conf ) : true ).then( () => conf)
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
		//console.log("compile-file",file)
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
		return `// Программа сгенерирована clon-lang -- https://github.com/pavelvasev/clon-lang\n${this.get_global_code()}\n${code}`
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
let mmm = tool.load_modules( default_modules.map( x => path.join(COMMON_PLUGINS_DIR,x) ), state)

//////////////// загружаем плагин платоформы
// он там загрузит еще что надо

// todo считывать из конфига может? или как в LF, target "C"
let platform = process.env.PLATFORM || "js"
let platform_dir = path.join( PLATFORMS_DIR, platform )
tool.platform_dir = platform_dir

mmm = mmm.then( x => tool.load_modules( [tool.platform_dir], state) )

//////////////// ну поехали

let command = process.argv[2] || "compile"

// F-FIX-PATH надо добавить путь к текущему clon-установке чтобы стала доступны утилита clon
// именно этой установки. это используется сейчас в run-tests.
// хотя быть может на будущее проще говорить что-то вроде npm exec clon?
process.env.PATH = [CLON_DIR].concat( process.env.PATH.split(path.delimiter) ).join(path.delimiter);

mmm.then( () => {
	tool.get_command(command).apply( this, [...process.argv].slice(3) )	
})