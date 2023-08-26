// F-MODULE-PATHS

import * as C from "../../lib/cl2-compiler.js"
import * as FORMS from "../../lib/forms.js"

let default_cp = (assigned_names) => { return {normal: assigned_names, renamed: {}, pos_rest: [],named_rest:[]} }

export function setup( state )
{
	//console.log(333)
	state.env.cofunc = { make_code: cofunc, check_params: default_cp}
	//state.env.fun = { make_code: fun, check_params: default_cp}
}

/*
export var tablica = {
	let: { make_code: _let, check_params: default_cp }	
	//,reaction: { make_code: reaction, check_params: default_cp}
	// return..
}
*/

// вычислительный режим
// на выходе ну наверное фнкция должна быть
export function cofunc( obj, state )
{
	// поменяем особые формы
	// let modified = C.modify_env( state, tablica )
	let modified = {...state,compute_mode:true}
	let c_state = C.modify_parent( modified, `self` )
	let s = C.objs2js( Object.values(obj.children),modified )
	//console.log("in called. result=",base)
	let self_objid = C.obj_id( obj, state )
	let args = obj.children_env_args.attrs.map(x => "__" + x).join(",")
	//return { main: [`CL2.mark_task_function( (${args}) => {`,s,"})"], bindings:[] }
    // поскольку мы выдаем функцию.. то на вход идут конкретные значения
    // но в коде мы считаем их коммуникац. примитивами. и поэтому мы их оборачиваем в примитивы, эти значения.
	let args_cells = obj.children_env_args.attrs.map(x => `let ${x} = CL2.create_cell( __${x} )`)

	let output_things = ["let self = {};","let output = CL2.create_cell();","CL2.attach( self,'output',output )"]

	return { main: [`let ${self_objid} =  CL2.create_item()`,
		`let ${self_objid}_output = CL2.create_cell(`,
		    [`CL2.mark_task_function( (${args}) => {`,args_cells, output_things, s,"return output","})"],
		    ")",
		 `CL2.attach( ${self_objid}, 'output',${self_objid}_output )`],
	     bindings:[] }
}