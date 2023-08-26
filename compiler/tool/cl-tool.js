#!/bin/env -S node --stack_trace_limit=200 

// пример запуска: ./clc.js 1.cl

// командной строки компилятор
import './node-fetch-fix.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as C from "../lib/cl2-compiler.js"

function compile_string( str, state )
{
	let dump = C.code2obj( str )		
	let jsarr = C.objs2js( dump,state )
	let js = C.strarr2str( jsarr )
	return js
}

// file это путь к файлу
function compile_file( file, state ) 
{
		let content = fs.readFileSync( file ,{ encoding: 'utf8', flag: 'r' });

	  let module_state = C.modify_dir( state, path.dirname( file ) + "/")
	  // мы вызываем это objs2js чтобы наполнить module_state определениями из прочитанного кода
		let code = compile_string( content, module_state )

		return {code,state:module_state}
}

let state = C.create_state()
let global_prefix = []

// плагины-фичи
import * as F from "../lib/forms.js"
F.setup( state )
import * as FBUNDLE from "../plugins/bundle-2/bundle-2.js"
FBUNDLE.setup( state )
import * as FMPATH from "../plugins/module-path/module-path.js"
FMPATH.setup( state )

import * as FMCOMPUTE from "../plugins/compute/compute.js"
FMCOMPUTE.setup( state )


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
					global_prefix.push( state.space.register_import_outer(src, file) )
				}
				else {

					// пока так...
					let content = fs.readFileSync( file ,{ encoding: 'utf8', flag: 'r' });

				  module_state = C.modify_dir( state, path.dirname( file ) + "/")
				  // мы вызываем это objs2js чтобы наполнить module_state определениями из прочитанного кода
					let code = compile_string( content, module_state )
					
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

/*
state.env["_import"] = {
	make_code: function( obj, state ) {
		let promarr = []
		for (let tgt in obj.params) {
			let src = obj.params[tgt]
			console.log("importing",src,"to name",tgt)
			let p = fetch( file ).then( r => r.text() ).then( content => {
			  //console.log(content)
			  let substate = C.modify_dir( state, "")
				let code = compile_string( content, substate )
				state.env["tgt"] = substate // пока так
				// а что с code делать и вовсе неясно
			})
			promarr.push( p )
		}
		let res = Promise.all( promarr ).then( values => {
			return { main: ["// qqq"], bindings: [] }
		})
		return res
  },
	check_params: () => {}
}
*/

let file = process.argv[2] || "main.cl";
// добавляя полный путь, мы обеспечиваем возможность внутрях вычислить текущий каталог из него и тогда хорошо отрабатывает загрузчики внутренние
file = "file://" + file // Vrungel.add_dir_if( file, process.cwd() + "/" );

// extension should include the dot, for example '.html'

function changeExtension(file, extension) {
  const basename = path.basename(file, path.extname(file))
  return path.join(path.dirname(file), basename + extension)
}
//let out_file = changeExtension(file,".js")
let out_file = file.slice(7) + ".js"

//state.current = state.env // нда уж
let default_things = compile_file( state.space.resolve_module_path( "std/default.cl", state ), state)
let global_code = default_things.code
state = C.modify_env( state, default_things.state.current )
// ну типа тут в current всем добавится.. ну хорошо..
//state.env = {...state.env,  }

fetch( file ).then( r => r.text() ).then( content => {
	//console.log(content)

	let code = compile_string( content, state )
	let prefix = global_prefix.join("\n")

	code = global_code + "\n" + code 

	code = `import * as CL2 from 'cl2'\n${prefix}\nlet self={}\n${code}`
	//console.log("import * as CL2 from '../runtime/cl2.js'")
  //console.log(code)
  fs.writeFile( out_file, code,(err) => {
  	if (err) console.log(err)
  	console.log("done: ",file,"-->",out_file)
  } )
})