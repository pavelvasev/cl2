#!/bin/env -S node --stack_trace_limit=200 

// пример запуска: ./clc.js 1.cl

// командной строки компилятор
import './node-fetch-fix.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as C from "../lib/cl2-compiler.js"

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Tool {

	constructor( state ) {
		//this.state = state
		// будем запихивать?
	}

	load_modules( dir, state ) {
		//console.log("load_modules: dir=",dir)
		if (Array.isArray(dir)) {
			if (dir.length == 0) return true
			let next = this.load_modules( dir[0], state )
			return next.then( () => {
				return this.load_modules( dir.slice(1), state)
			})
		}

		if (!dir.endsWith(".js"))
			dir = path.join(dir,"init.js")

		return import( dir ).then( m => {
		  return m.init( state, this )			
		})
	}

	compile_string( str, state )
	{
		let dump = C.code2obj( str )		
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
		return fetch( file ).then( r => r.text() ).then( content => {
			//console.log(333,"state.env=",state.env)
		  let module_state = C.modify_dir( state, path.dirname( file ) + "/")
		  // мы вызываем это objs2js чтобы наполнить module_state определениями из прочитанного кода
			let code = this.compile_string( content, module_state )
			return {code,state:module_state}			
		})
	}	

	global_code = []

  // каждый элемент code - строчка, массив строчек, массив массивов..
	add_global_code( ...code ) {
		this.global_code.push( ...code )
	}
	get_global_code() {
		return C.strarr2str( this.global_code )
	}

	gen_full_code( code ) {
		return `import * as CL2 from 'cl2'\nlet self={}\n${this.get_global_code()}\n${code}`
	}

	commands = {}

	add_command( name, fn ) {
		this.commands[name] = fn
	}
	get_command( name ) {
		if (!this.commands[name])
			throw new Error("tool: command not found! ",name)
		return this.commands[name]
	}

	config = {}

	get_config_modules() {
		return this.config?.modules || {}
	}

}

///////////////////////////////////////////

let tool = new Tool()
let state = C.create_state()

let DEFAULT_PLUGINS_DIR = path.resolve( path.join( __dirname,"..","plugins") )
let default_modules = [
	"forms/forms.js",
	"bundle-2/bundle-2.js",
	"module-path/module-path.js",
	"defaults",
	"compute/compute.js",
	"config",
	"compile",
	"run"
	]
let modules_to_import = default_modules // todo добавить из config.cl?
let mmm = tool.load_modules( modules_to_import.map( x => path.join(DEFAULT_PLUGINS_DIR,x)), state)

// уже прочитанные модули
let imported_modules = {} // abs-path => state

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
			let file = state.space.resolve_module_path( src, state )

			let module_state = imported_modules[ file ]

			// мы с ним уже разобрались
			if (!module_state) {
				//console.log("file->",src)
				// жесточайший хак. 1 надо начинать это еще в resolve_module_path, 2 это вообще цепочка обработки импорта, надо ее формализовать
				if (file.endsWith(".js")) { 
					//global_prefix.push( state.space.register_import_outer(src, file) )
					tool.add_global_code( state.space.register_import_outer(src, file) )
				}
				else {

					// пока так...
					let content = fs.readFileSync( file ,{ encoding: 'utf8', flag: 'r' });

				  module_state = C.modify_dir( state, path.dirname( file ) + "/")
				  // мы вызываем это objs2js чтобы наполнить module_state определениями из прочитанного кода
					let code = tool.compile_string( content, module_state )
					
					imported_modules[ file ] = module_state

					//strs.push(`import * as ${tgt} from '${js_import_path}'`)
					strs.push( state.space.register_import( tgt, file, module_state,code ) )
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

mmm.then( () => {
	tool.get_command(command).apply( this, [...process.argv].slice(3) )	
})

