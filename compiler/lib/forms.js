// особые формы CL2 уровня кодо-генерации, для языка Javascript

import * as C from "./cl2-compiler.js"

export function setup( state ) {
	state.env = tablica
}

let default_cp = (assigned_names) => { return {normal: assigned_names, renamed: {}, pos_rest: [],named_rest:[]} }

export var tablica = {
	let: { make_code: _let, check_params: default_cp },
	obj: { make_code: _obj, check_params: default_cp },
	attach: { make_code: attach, check_params: default_cp },
	channel: { make_code: channel, check_params: default_cp },
	func: { make_code: func, check_params: default_cp },
	cell: { make_code: cell, check_params: default_cp },
	bind: { make_code: bind, check_params: default_cp },
	init: { make_code: init, check_params: default_cp },
	paste: { make_code: paste, check_params: default_cp },
	in: { make_code: _in, check_params: default_cp},
	react_orig: { make_code: react, check_params: default_cp},
	nop: { make_code: () => { return { main: [], bindings: [] } }, check_params: default_cp}
}

/*
  таблица env составляется из записей вида
  _id:
    check_params: ( names-list ) -> {params,rest,named_rest}
    где names-list массив имен а params,rest,named-rest массивы тоже имен.
    либо выкинуть исключение если с параметрами что-то не так.

    make_code: ( obj, env ) -> {main:arr, bindings: arr}
    - должна вернуть два массива строк кода.
  
*/

export function _let( obj, state )
{
	// let вызывает default_obj2js чтобы разрулить выражения
	//let base = C.default_obj2js( obj,state )
	//let base = C.objs2js( obj,state )
	let base = { main: [], bindings: [] }

	//  и фичеры.. это у нас дети которые не дети	
	if (obj.features_list) {
		let mod_state = C.modify_parent(state,obj.$name)
		for (let f of obj.features_list) {
			let o = C.one_obj2js_sp( f, mod_state )
			base.main.push( o.main )
			//bindings.push("// bindings from feature-list")
			base.bindings.push( o.bindings )
		}
	}
	
	let strs = []
	for (let k in obj.params) {
		let val = obj.params[k]
		//let s = `let ${k} = ${val.toString()}`
		let val_str = val?.from ? "CL2.NOVALUE" : C.objToString(val)
		let s = `let ${k} = CL2.create_cell( ${val_str} )`
		strs.push( s )
		if (val?.from) {
			//let q = `let ${name} = CL2.create_binding(${obj.params[0].from},${obj.params[1].from})`
			let q = `CL2.create_binding(${val.from},${k}) // from let expr`
			base.bindings.push( q )
		}
	}
	base.main.push( strs )

	return base
}

// по объектовой записи объекта понять кто его параметры включая каналы
export function get_obj_params( obj ) {
	let params = {}
	let rest_param, named_rest_param, children_param, next_obj_param

	let in_p = Object.values(obj.children).find( c => c.basis == "in")
	if (!in_p) return {params}

  // вот этим шагом можно параметры будет отдельно рендерить
	//obj.in_params = in_p
	//delete obj.children[ in_p.$name ]
	
		for (let k of Object.values(in_p.children)) {
			//console.log("checking k=",k.$name,k.basis)
			if (k.basis == "cell" || k.basis == "channel" || k.basis == "func")
			{
				params[ k.$name ] = true
				k.$name_modified = k.$name
			}

			if (k.$name.endsWith("**")) {
				k.$name_modified = k.$name.slice(0,-2)
				named_rest_param = k.$name_modified
			}
			else
				if (k.$name.endsWith("*")) {
					k.$name_modified = k.$name.slice(0,-1)
					rest_param = k.$name_modified
				}
			else
			if (k.$name.endsWith("&")) {
					k.$name_modified = k.$name.slice(0,-1)
					children_param = k.$name_modified
				}	
		  else
			if (k.$name.endsWith("~")) {
					k.$name_modified = k.$name.slice(0,-1)
					next_obj_param = k.$name_modified
				}
		}		
	
	//console.log("get-obj-params obj=",obj.$name, "in=",in_p,{params,rest_param,named_rest_param})

	return {params,rest_param,named_rest_param,children_param,next_obj_param}
}

export function _in( obj, state )
{
	//let base = C.one_obj2js( obj,state )
	let s = C.objs2js( Object.values(obj.children),state )
	//console.log("in called. result=",base)
	return { main: ["// input params",s,"// end input params"], bindings:[] }
}

export function _obj( obj, state )
{
	// чет я не очень понял зачем вызывать one_obj2js...
	//let base = C.one_obj2js( obj,state )
	let base = { bindings: []	}

	//let strs = []
	let id = obj.params[0] || obj.$name
	//let s = `export function create_${id}( initial_values )`
	//strs.push(`/// type ${id}`,s,"{")

	let strs2 = []
	strs2.push(`let self=CL2.create_item()`)
	//strs2.push(`let self=CL2.create_item()`)

	// todo передалать. но тут тупорого - мы удаляем просто позиционные
	let {params,rest_param,named_rest_param, children_param,next_obj_param} = get_obj_params( obj )
	//console.log("get-obj-params:",{params,rest_param,named_rest_param})
	let obj_params = params
	let positional_names = Object.keys(params)
	let starting_rest = positional_names.findIndex( id => id.endsWith("*"))
	if (starting_rest >= 0)
		positional_names = positional_names.slice( 0, starting_rest )

///////////////// тело указанное в init

	let c_state = C.modify_parent( state, "self" )
	let body = C.objs2js( Object.values(obj.children), c_state )
	//strs2.push( body )

	strs2.push( "// inner children",body )
	/*
	for (let k in obj.children)
	{
		//objs2js( Object.values(obj.children) )
		let append_child = `self.append( ${k} )`
		strs2.push( append_child )
	}
	*/

	strs2.push(`return self`)
	//strs.push( strs2 )
	//strs.push("}")

	let strs = state.space.register_item( id, state, strs2 )
	//let strs = 

	base.main= strs

	// состояние компилятора
	//console.log("saving to statE:",id, state.current, state.env)
	state.current[ id ] = {
		make_code: (obj,state) => { 
			let self_objid = `${state.prefix}${obj.$name}` // todd синхронизировать с default_obj2js
			if (next_obj_param)
				state.next_obj_cb = (obj,objid,strs) => {
					if (obj.basis == next_obj_param) {
						strs.push( `${self_objid}.${next_obj_param}.set( ${objid} )` )
					}
					state.next_obj_cb = null
				}
			return C.default_obj2js(obj,state) },
		check_params: ( param_names, locinfo ) => {
			//console.log("check_params of id",id,"param_names=",param_names,"obj_params=",obj_params)
			// задача - по каждому указанному входному параметру дать информацию
			// как его следует подавать
			// - как именованный (и как именно - это касается позиционной подачи)
			// - в рест позиционный - в рест именованный (и какое имя)
			let named = [], pos_rest_names = [], named_rest_names=[]
			let renamed = {}
			pos_rest_names.name = rest_param
			named_rest_names.name = named_rest_param
			for (let k of param_names) {
				if (obj_params.hasOwnProperty( k )) {
					named.push( k )
					continue
				}
				let qq = positional_names[k] // F-POSITIONAL-RENAME
				if (obj_params.hasOwnProperty( qq )) {
					named.push( k )
					renamed[k] = qq
					continue
				}
				// есть рест и обычные - заполнены
				if (rest_param && named.length == positional_names.length) {
					pos_rest_names.push( k )
					// todo но это только если k - позиционно подан
					continue // временное название для **
				}
				if (named_rest_param) {
					pos_rest_names.push( k )
					continue // временное название для *
				}
				console.error(`object ${id} has no parameter ${k}. obj.params=`,obj_params, locinfo)
				throw new Error( `object ${id} has no parameter ${k}`)
			}
			return {normal:named,renamed,pos_rest:pos_rest_names, named_rest: named_rest_names, children_param}
		},
		get_params: () => {
			return obj_params
		},
		get_positional_names: () => { // выдает таблицу
			return Object.keys(params)
		}
	}

	return base
}


export function attach( obj, state )
{
	let base = C.one_obj2js( obj,state )

	let strs = []
	let body = C.objs2js( obj )
	strs.push("// attach ")
	strs.push( body )

	for (let name in obj.children)
		strs.push( `CL2.attach( ${state.struc_parent_id},"${name}",${name} )` )

	base.main= strs

	return base
}


export function cell( obj, state )
{
	let name = obj.$name_modified || obj.$name

  let initial_value = null
  let p0 = obj.params[0]
  if (p0) {
  	if (p0.link)
  		initial_value = p0.from
  	else
  	  initial_value = C.objToString(p0)	
  } 
	let value_str = `initial_values.${name} || ${initial_value || 'CL2.NOVALUE'}`

	let strs = [`let ${name} = CL2.create_cell(${value_str})`]
	//let strs = [`let ${name} = CL2.create_cell(${obj.params[0] || ''})`]
	strs.push( `CL2.attach( self,"${name}",${name} )` )

	return {main:strs,bindings:[]}
}

export function channel( obj,state )
{
	let name = obj.$name_modified || obj.$name
	let strs = [`let ${name} = CL2.create_channel()`]
	strs.push( `CL2.attach( self,"${name}",${name} )` )

	return {main:strs,bindings:[]}
}

export function init( obj, state )
{
	let strs = []
	strs.push( `let init = `,C.value_to_arrow_func(obj.params[0]),`init(${state.tree_parent_id})` )

	return {main:strs,bindings:[]}
}

// странная вещь. а для импортов была идея global-paste и там можно по ключам кстати
// чтобы не дублирвоать
export function paste( obj, state )
{
	let strs = []
	strs.push( obj.params[0] )

	return {main:strs,bindings:[]}
}


let ccc = 0
// действие типа "функция"
export function func( obj, state )
{
	let name = obj.$name_modified || obj.$name

	let fn_code = obj.params[0]
	//console.log(fn_code,obj.features_list)
	
	let strs = [`function ${name}(${fn_code.pos_args.join(',')}) { ${fn_code.code} }`]
	strs.push( `CL2.attach( self,"${name}",${name} )` )

	//state.current[ name ] - а кстати идея.. зарегать так объект..
	state.static_values[ name ] = true

	return {main:strs,bindings:[]}
}

export function bind( obj, state )
{
	let name = obj.$name

	let strs = [`let ${name} = CL2.create_binding(${obj.params[0].from},${obj.params[1].from})`]
	//strs.push( `CL2.attach( self,"${name}",${name} )` )

	return {main:strs,bindings:[]}
}
// bind @func @ch


export function react( obj, state )
{
	let name = obj.$name
	//console.log("working on reaction",obj)
	let code = C.value_to_arrow_func(obj.params[1])
	// todo: chech {: :}

	let strs = []

	//strs.push( `CL2.attach( self,"${name}",${name} )` )

	let bindings = []

	//  и фичеры.. это у нас дети которые не дети	а всякие выражения	
	if (obj.features_list) {
		let mod_state = C.modify_parent(state,obj.$name,null)
		for (let f of obj.features_list) {
			let o = C.one_obj2js_sp( f, mod_state )
			strs.push( o.main )
			//bindings.push("// bindings from feature-list")
			bindings.push( o.bindings )
		}
	}

	strs.push( `let ${name} = CL2.create_reaction(${code})`)

/*
	for (let k in Object.keys(obj.params).slice(0,-1)) {
		let val = obj.params[k]
		let val_str = val?.from ? "CL2.NOVALUE" : C.objToString(val)
		let s = `let ${k} = CL2.create_cell( ${val_str} )`
	}		
*/

	//let src_param = obj.params[ Object.keys( obj.params )[0] ]
	let src_param = obj.params[0]
	let srcname = src_param.from
	
	bindings.push( `CL2.create_binding( ${srcname},${name} )` )

	return {main:strs,bindings:bindings}
}