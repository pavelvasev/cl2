// F-MODULE-PATHS

import * as C from "../../lib/cl2-compiler.js"
import * as FORMS from "../../lib/forms.js"

let default_cp = (assigned_names) => { return {normal: assigned_names, renamed: {}, pos_rest: [],named_rest:[]} }

export function setup( state )
{
	//console.log(333)
	state.env.compute = { make_code: compute, check_params: default_cp}
	state.env.fun = { make_code: fun, check_params: default_cp}
}

export var tablica = {
	let: { make_code: _let, check_params: default_cp }	
	//,reaction: { make_code: reaction, check_params: default_cp}
	// return..
}

// вычислительный режим
// на выходе ну наверное фнкция должна быть
export function compute( obj, state )
{
	// поменяем особые формы
	// let modified = C.modify_env( state, tablica )
	let modified = {...state}

	// но кстати, мб надо не модифицировать а тупо заменять. чтобы не было путаницы.
	//let modified = {...state}
	//modified.env = tablica
	// но там cell всякие.. ладно посмотрим

	let s = C.objs2js( Object.values(obj.children),modified )
	//console.log("in called. result=",base)
	return { main: ["() => {",s,"}"], bindings:[] }
}

//////////////////////////////////

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
		let s = `let ${k} = CL2.create_cell( ${val_str} )` // todo: create_promise
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

// ну вот будем делать функции
export function fun( obj, state )
{
	// чет я не очень понял зачем вызывать one_obj2js...
	//let base = C.one_obj2js( obj,state )
	let base = { bindings: []	}

	//let strs = []
	let id = obj.params[0] || obj.$name
	//let s = `export function create_${id}( initial_values )`
	//strs.push(`/// type ${id}`,s,"{")

	let strs2 = []
	// strs2.push(`let self=CL2.create_item()`)
	strs2.push(`let self=CL2.create_object()`)

	// todo передалать. но тут тупорого - мы удаляем просто позиционные
	let {params,rest_param,named_rest_param} = FORMS.get_obj_params( obj )
	//console.log("get-obj-params:",{params,rest_param,named_rest_param})
	let obj_params = params
	let positional_names = Object.keys(params)
	let starting_rest = positional_names.findIndex( id => id.endsWith("*"))
	if (starting_rest >= 0)
		positional_names = positional_names.slice( 0, starting_rest )

///////////////// тело указанное в init

	let modified = C.modify_env( state, tablica )
	// но кстати, мб надо не модифицировать а тупо заменять. чтобы не было путаницы.
	//let modified = {...state}
	//modified.env = tablica
	// но там cell всякие.. ладно посмотрим

	let body = C.objs2js( Object.values(obj.children),modified )	

	//let body = C.objs2js( Object.values(obj.children), state )
	//strs2.push( body )

	strs2.push( "// inner statements",body )
	/*
	for (let k in obj.children)
	{
		//objs2js( Object.values(obj.children) )
		let append_child = `self.append( ${k} )`
		strs2.push( append_child )
	}
	*/

	// strs2.push(`return result`)
	strs2.push(`return self`) // или output таки возвращать?
	//strs.push( strs2 )
	//strs.push("}")

	let strs = state.space.register_item( id, state, strs2 )

	base.main= strs

	// состояние компилятора
	//console.log("saving to statE:",id)
	state.current[ id ] = {
		make_code: (obj,state) => default_fun2js(obj,state),
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
			return {normal:named,renamed,pos_rest:pos_rest_names, named_rest: named_rest_names}
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


export function default_fun2js( obj,state ) {
	//let objid = varcoutner++
	let basis = obj.basis
	// проверим параметр
	let basis_record = C.get_record(state,obj.basis_path, obj) // пусть уш передают тогда?

	if (!basis_record.check_params) {
		console.error("env basis record have no check_params! for basis=",obj.basis_path,"obj=",obj,"basis_record=",basis_record)
		throw new Error( "env basis have no check_params")
	}	
	
	let bindings_hash = {}
 	let output_binding
 	if (obj.links.output_link?.to) {
 		output_binding = `${state.struc_parent.$name}.${obj.links.output_link?.to}`
 	}
	let links_names = Object.keys(obj.links)

		for (let k of links_names) {
			if (k == "output_link")	continue; // медленно
			let link = obj.links[k]
			bindings_hash[ link.to ] = link.from
		}

	let assigned_names = Object.keys(obj.params) //.concat( Object.keys(bindings_hash) )
	// важно было вписать все в единую структуру, чтобы сохранить порядок
	// ибо там вперемешку может быть и константы, и ссылки.
	// поэтому в принципе obj.links это может быть просто список имен например

	//console.log("obj.$name=",obj.$name,"assigned_names=",assigned_names,"bindings_hash=",bindings_hash)//obj=",obj)
	let {normal, renamed, pos_rest,named_rest} = basis_record.check_params( assigned_names, obj.locinfo )
	//let renamings = basis_record.get_positional_names()
	// renamings - преобразует старое имя в имя, которое надо подавать
	// используется для преобразования имен позиционных параметров
	// строится тривиально -

	// F-POSITIONAL-RENAME
	function internal_name(name) {
		return renamed[name] || name
	}

	//console.log("called check_params with",assigned_names,"got",{normal,pos_rest,named_rest})
	normal ||= []
	pos_rest ||= []
	named_rest ||= []

	let init_consts = {}
	let bindings = []

	for (let name of normal) {
		if (bindings_hash[ name ])
			init_consts[ internal_name(name) ] = "CL2.NOVALUE"
		else
			init_consts[ internal_name(name) ] = obj.params[name]
	}

	let objid = `${state.prefix}${obj.$name}`
	let strs = [`/// fun ${objid}`]
	let strs2 = []

	if (pos_rest.length > 0) {

		bindings_hash[ pos_rest.name ] = pos_rest.name
		let pos_cells = []
		for (let j=0; j<pos_rest.length; j++) {
			let name = pos_rest[j]		
			if (!bindings_hash[ name ]) {
				strs2.push( `let pos_cell_${j} = CL2.create_cell( ${objToString(obj.params[name]) })`)
				strs2.push( `pos_cell_${j}.$title="pos_cell_${j}"; pos_cell_${j}.attached_to=${objid}` )
				pos_cells.push(`pos_cell_${j}`)
				delete init_consts[ name ]
				//init_consts[ name ] = "CL2.NOVALUE"			 
				
			}
			else
			{
				let to = bindings_hash[ name ]
				delete bindings_hash[ name ]
				pos_cells.push(to)
			}
			// стало быть это ссылки типа binding..
		}
		bindings.push( `let ${pos_rest.name} = CL2.create_cell( [${pos_cells.join(',')}] )`)
		bindings.push( `${pos_rest.name}.$title="${pos_rest.name}"; ${pos_rest.name}.attached_to = ${objid}`)
		//init_consts[ pos_rest.name ] = pos_cells
	}

	////////////
	
	strs.push( `let ${objid} = ${obj.modul_prefix}create_${obj.basis}( ${C.objToString(init_consts)} )`)
	strs.push( `${objid}.$title = "${objid}"`)

// теперь надо бы детей
	let children_code = C.objs2js( Object.values(obj.children),state )

	if (children_code.length > 0)
	{
		strs.push( "// outer children","let outer_children = () => {",children_code,"}" )
		bindings.push( `${objid}.block.set( outer_children )`)
		/*
		for (let k in obj.children)
		{
			//objs2js( Object.values(obj.children) )
			let append_child = `${objid}.append( ${k} )`
			strs.push( append_child )
		}
		*/
	}

	strs.push( strs2 ) // rest-накопления

	//  и фичеры.. это у нас дети которые не дети	
	if (obj.features_list) {
		strs.push( `// features_list of ${objid}`)
		let mod_state = modify_parent(state,objid)
		//let mod_state = modify_prefix( modify_parent(state,obj), `${state.prefix}${obj.$name}` )
		//strs.push("{") // нужна своя область видимости чтобы идентификаторы не путались..
		for (let f of obj.features_list) {
			let o = C.one_obj2js_sp( f, mod_state )
			strs.push( o.main )
			//bindings.push("// bindings from feature-list")
			bindings.push( o.bindings )
		}
		//strs.push("}")
		
		//let f_code = objs2js( obj.features_list )
		//strs.push( f_code )
	}
	
	//let links_names = Object.keys(obj.links)
		if (output_binding) {
			let linkstr = `${objid}.release.subscribe( CL2.create_binding( ${objid}.output, ${output_binding} ).unsub )`
			bindings.push( `// output binding of ${objid}`,linkstr )
		}

		for (let k in bindings_hash) {
			//let link = obj.links[k]
			let linkstr = `${objid}.release.subscribe( CL2.create_binding( ${bindings_hash[k]}, ${objid}.${internal_name(k)} ).unsub ) // hehe objid=${objid} prefix=${state.prefix}`
			bindings.push( `//bindings from ${objid}`,linkstr )
		}
		

	return {main:strs,bindings}
}