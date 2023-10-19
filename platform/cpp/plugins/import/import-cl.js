// F-TASKS

import * as C from "../../../../compiler/lib/cl2-compiler.js"
import * as FORMS from "../forms/forms.js"

import * as path from 'node:path';
import * as fs from 'node:fs';

export function init( state, tool )
{
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

				// F-IMPORTED-STATE
				state.current[tgt] = module_state

				strs.push( state.space.register_import_use( tgt, file, module_state ) )
			}
			return { main: strs, bindings: [], prefix: outers }
	  },
		check_params: () => {}
	}

}

