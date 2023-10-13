import * as C from "../../lib/cl2-compiler.js"
import * as FORMS from "../forms/forms.js"
import * as CO from "../compute/compute.js"

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function init( state, tool ) {
    state.env.transform = { 
       transform: transform, 
       check_params: FORMS.default_cp
    }

	//let default_things = tool.compile_file( state.space.resolve_module_path( "./macros.cl", state ), state)
	let default_things = tool.compile_file( path.join(__dirname,"macros.cl"), state)
	state.env = {...state.env, ...default_things.state.current}
	tool.add_global_code( "// from macros.cl" )
	tool.add_global_code( default_things.code )    
}

export function transform( i, objs, state )
{
	let obj = objs[i]

	let name = obj.params[0]
	let	fn_code = obj.params[1]

	// но кстати шутка - это можно на Слоне писать формы?
	fn_code = CO.cocode_to_code( fn_code,state,true,true )

	//let f = eval( fn_code )
	// console.log("fn_code =",fn_code )

	let f = new Function( ...fn_code.pos_args, fn_code.code )

	state.current[ name ] = {
		basis: name,
		transform: (i,objs,state) => {
			let res = f( i,objs,state,C )
			//console.log("TTTTTT res=",res)
			return res
		},
		check_params: FORMS.default_cp
  }
  // но кстати вопрос.. а если оно ну там что-то поделает и вернет опять obj-запись?

	objs.splice(i,1)
	return [i,objs]
}
