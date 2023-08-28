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
	//let modified = {...state,compute_mode:true}
	//let c_state = C.modify_parent( modified, `self` )
	let modified = {...state}
	modified.next_obj_cb = ( obj, objid, strs, bindings, bindings_hash_before_rest ) => {
	  let source_comms = Object.values(bindings_hash_before_rest)

	  if (source_comms.length == 0) return;
	  // нет зависимостей - ну сразу делаем

	  //strs.push( `let ${objid} = create_task( ${objToString( {consts:init_consts,basis_func:obj.basis, bindings_hash},,1,state)} )`)
	  let r_strs = []
	  let r_id = `${objid}_task`
	  r_strs.push( `let ${r_id} = create_react({})`,
	  	`let ${objid} = ${r_id}`, // внешние ссылаются по старому имени
	  	//`${r_id}.action.set( () => { `,strs,bindings,`if (${objid}.output) CL2.create_binding( ${objid}.output, ${r_id}.output`,` })`,
	  	`${r_id}.action.set( () => { `,[...strs],[...bindings],`return ${objid}.output`,` })`
	   )

	  // заменяем
	  strs.splice( 0, strs.length, ...r_strs )
	  console.log('strs replaced:',strs)
	  bindings.splice( 0, bindings.length,`CL2.create_binding( CL2.when_all( [${source_comms.join(',') }] ), ${r_id}.input )`)
	}

	let s = C.objs2js( C.get_children( obj ),modified )
	//console.log("in called. result=",base)
	let self_objid = C.obj_id( obj, state )
	let args, args_cells
	let head = C.get_children_head( obj )
	if (head) {
    	args = head.attrs.map(x => "__" + x).join(",")
		//return { main: [`CL2.mark_task_function( (${args}) => {`,s,"})"], bindings:[] }
    	// поскольку мы выдаем функцию.. то на вход идут конкретные значения
    	// но в коде мы считаем их коммуникац. примитивами. и поэтому мы их оборачиваем в примитивы, эти значения.
		args_cells = head.attrs.map(x => `let ${x} = CL2.create_cell( __${x} )`)
	}

	let output_things = ["let self = {};","let output = CL2.create_cell();","CL2.attach( self,'output',output )"]

	return { main: [`let ${self_objid} =  CL2.create_item()`,
		`let ${self_objid}_output = CL2.create_cell(`,
		    [`CL2.mark_task_function( (${args}) => {`,args_cells, output_things, s,"return output","})"],
		    ")",
		 `CL2.attach( ${self_objid}, 'output',${self_objid}_output )`],
	     bindings:[] }
}