import * as path from 'node:path';
import * as C from "../../../../compiler/lib/cl2-compiler.js"

export function init( st ) {

	let space = st.space
	space.default_obj2js = default_obj2js
	space.value_to_arrow_func = value_to_arrow_func
	//space.objToString = objToString 
}

export function default_obj2js( obj,state ) {
	//console.log("default_obj2js",obj)
	//let objid = varcoutner++
	let basis = obj.basis
	// проверим параметр
	let basis_record = C.get_record(state,obj.basis_path, obj) // пусть уш передают тогда?

	if (!basis_record.check_params) {
		console.error("env basis record have no check_params! for basis=",obj.basis_path,"obj=",obj,"basis_record=",basis_record)
		throw new Error( "env basis have no check_params")
	}

	//console.log("working on objid",obj_id( obj, state ), obj.locinfo)

	let bindings_hash = {}
 	let output_binding
 	if (obj.links.output_link?.to) {
 		output_binding = `${state.struc_parent_id}.${obj.links.output_link?.to}`
 	}
	let links_names = Object.keys(obj.links)

		for (let k of links_names) {
			if (k == "output_link")	continue; // медленно
			let link = obj.links[k]
			// F-TODO-CHECK-NAMESPACES
			//console.log("checking link",link.from,"is static=",state.static_values[ link.from ])
			if (state.static_values[ link.from ]) // F-STATIC-VALUES
				continue
			bindings_hash[ link.to ] = link.from
		}

	let assigned_names = Object.keys(obj.params) //.concat( Object.keys(bindings_hash) )
	// важно было вписать все в единую структуру, чтобы сохранить порядок
	// ибо там вперемешку может быть и константы, и ссылки.
	// поэтому в принципе obj.links это может быть просто список имен например

	//console.log("obj.$name=",obj.$name,"assigned_names=",assigned_names,"bindings_hash=",bindings_hash)//obj=",obj)
	let {normal, renamed, pos_rest,named_rest,children_param, pos_splat, named_splat} = basis_record.check_params( assigned_names, obj.params, obj.locinfo )
	
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
	pos_splat ||= []
	named_splat ||= []

	let init_consts = {}
	let bindings = []

	// F-CHILDREN-PARAM
  // если объект готов принимать чилдрен-параметра
  if (children_param) {
  	if (obj.params[ children_param ]) {
  		// если задан явно чилдрен-параметр то это отдельный случай
  		let v = obj.params[ children_param ]
  		if (v.cofunc)
  			v.children_mode = true
  		// но кстати.. а если это ссылка. то мы приплыли.
  		// потому что - там уже код сгенерирован и сгенерирован не так. а как обычная кофункция.
  		// там можно будет сделать, но обходкой типа block { ... }
  		// но кстати и ладно.. но с другой стороны нюанс - получается как нам писать some gui={ button button }?
  		// они же по умолчанию тоже в функциональном режиме будут работать..
  		// итого, получается, это как-то на уровне динамики надо разруливать?
  		// ну или писать gui=(block {}) в принципе тоже вариант но это просто получается я перетащил что
  		// раньше надо было писать префикс-{} для вычислений, а теперь для чилдрен-блоков. смешное.
  	}
  	else
  	// и в вызове объекта присутствуют позиционные
  	if (obj.positional_params_count >= 0) {
			//let last_param_name = normal[ normal.length-1 ]			
			let v = obj.params[ obj.positional_params_count-1 ]
	   	if (v.cofunc)
			{
				// и значение последнего позиционного есть кофункция
				// то скажем, что этот позиционный надо посылать в имя, в котором принимают children_param
				renamed[ obj.positional_params_count-1 ] = children_param
				v.children_mode = true // подсказка для генератора
			}
		}	
	}

	for (let name of normal) {

		if (bindings_hash[ name ])
			init_consts[ internal_name(name) ] = "CL2.NOVALUE"
		else
			init_consts[ internal_name(name) ] = obj.params[name]
	}

	let objid = C.obj_id( obj, state )
	let strs = [`/// object ${objid}`]
	let strs2 = []
	state.generated_ids.push( objid )

	let bindings_hash_before_rest = {...bindings_hash} // надо для compute_mode

	//console.log({pos_rest,named_rest})
	if (pos_rest.name) {
		let rest_name = `${objid}_${pos_rest.name}`
		if (pos_rest.length > 0) {			
			// F-REST-REACT-ASAP bindings_hash[ pos_rest.name ] = rest_name
			let pos_cells = []
			for (let j=0; j<pos_rest.length; j++) {
				let name = pos_rest[j]		
				if (!bindings_hash[ name ]) {
					// константа
					let pos_cell_name = `pos_cell_${objid}_${j}`
					strs2.push( `let ${pos_cell_name} = CL2.create_cell( ${objToString(obj.params[name],1,state,obj) })`)
					strs2.push( `${pos_cell_name}.$title="pos_cell_${j}"; ${pos_cell_name}.attached_to=${objid}` )
					pos_cells.push(pos_cell_name)
					delete init_consts[ name ]
					//init_consts[ name ] = "CL2.NOVALUE"				
				}
				else
				{
					// ссылка
					let to = bindings_hash[ name ]
					delete bindings_hash[ name ]
					pos_cells.push(to)
				}
				// стало быть это ссылки типа binding..
			}
			
			bindings.push( `let ${rest_name} = CL2.create_cell( [${pos_cells.join(',')}] )`)
			bindings.push( `${rest_name}.$title="${pos_rest.name}"; ${rest_name}.attached_to = ${objid}`)
			// F-REST-AUTO-EXTRACT
			bindings.push( `${objid}.release.subscribe( CL2.monitor_rest_values( ${rest_name}, ${objid}.${pos_rest.name} ) )` )

			// F-REST-REACT-ASAP
			// bindings.push( `${objid}.${pos_rest.name}.submit( [${pos_cells.join(',')}] )`)

			//init_consts[ pos_rest.name ] = pos_cells
		} else {
			init_consts[ internal_name(pos_rest.name) ] = []
		}
  }

  // F-NAMED-REST
  let named_cells = {}
  let named_rest_name 
  if (named_rest.name) {
  	
  	//console.log("see named rest!",named_rest.name,"names=",...named_rest,named_rest.length)  	
  	if (named_rest.length > 0 || named_splat.length > 0) {
  		// если есть named_splat.length > 0 то нам понадобится ячейка named_rest для работы named-splat
  		named_rest_name = `${objid}_${named_rest.name}`
  		// F-REST-REACT-ASAP bindings_hash[ named_rest.name ] = named_rest_name
  		
			for (let j=0; j<named_rest.length; j++) {
				let name = named_rest[j]		
				if (!bindings_hash[ name ]) {
					// константа
					let named_cell_name = `named_cell_${objid}_${name}`
					strs2.push( `let ${named_cell_name} = CL2.create_cell( ${objToString(obj.params[name],1,state,obj) })`)
					strs2.push( `${named_cell_name}.$title="named_cell_${name}"; ${named_cell_name}.attached_to=${objid}` )
					named_cells[name]=named_cell_name
					delete init_consts[ name ]
					//init_consts[ name ] = "CL2.NOVALUE"				
				}
				else
				{
					// ссылка
					let to = bindings_hash[ name ]
					delete bindings_hash[ name ]
					named_cells[name]=to
				}
				// стало быть это ссылки типа binding..
			}
			//console.log("named_cells=",named_cells)
			bindings.push( `let ${named_rest_name} = CL2.create_cell( {${Object.keys(named_cells).map(k=>`"${k}":${named_cells[k]}`).join(',')}} )`)
			bindings.push( `${named_rest_name}.$title="${named_rest.name}"; ${named_rest_name}.attached_to = ${objid}`)
			//bindings.push( `let ${objid}_named_rest = CL2.${named_rest.name}.submit( {${Object.keys(named_cells).map(k=>`"${k}":${named_cells[k]}`).join(',')}} )`)
			// F-REST-AUTO-EXTRACT
			bindings.push( `${objid}.release.subscribe( CL2.monitor_rest_values( ${named_rest_name}, ${objid}.${named_rest.name} ) )` )

  	}
  	else {
  		init_consts[ internal_name(named_rest.name) ] = {}
  	}
  }

  // F-NAMED-SPLAT
  if (named_splat.length > 0) {
  	 let ns = named_splat[0]
  	 // создаем процесс мониторинга
  	 bindings.push( `let ${ns.name}_controlled_names = {${Object.keys(ns.controlled_names).map(k=>`"${k}":true`).join(',')}}`)
  	 // F-REST-AUTO-EXTRACT
  	 bindings.push( `let ${ns.name}_named_rest = ${named_rest_name ? named_rest_name : null}`)
  	 // начальное значение для rest_acc задается такое же, как было для named_rest выше..
  	 bindings.push( `${ns.source}.subscribe( (values) => {
  	 	 let rest_acc = {${Object.keys(named_cells).map(k=>`"${k}":${named_cells[k]}`).join(',')}}
  	 	 for (let name in values) {
  	 	 	if (${ns.name}_controlled_names.hasOwnProperty(name)) {
  	 	 		${objid}[name].submit( values[name] )
  	 	 	} else 
  	 	 	  if (${ns.name}_named_rest)
  	 	 	  	  rest_acc[ name ] = CL2.create_cell( values[name] )
  	 	 }
  	 	 if (${ns.name}_named_rest)
  	 	 	${ns.name}_named_rest.submit( rest_acc )
  	 })` )
  }

	////////////

	// init_consts["parent"] = state.struc_parent?.$name || "self"
	let obj_title = objid.indexOf( obj.basis ) < 0 ? `${objid}[${obj.basis}]` : `${objid}`
	init_consts['$title'] = obj_title
	if (obj.base_obj)  // hack F-MIXIN-INTERNAL
	    init_consts['base_obj'] = obj.base_obj
	
  strs.push( `let ${objid} = ${obj.modul_prefix}create_${C.get_basis(basis_record)}( ${objToString(init_consts,1,state,obj)} )`)
  // тоже чтобы можно было на него ссылаться напрямую, по значению
  state.static_values[ objid ] = true

	//strs.push( objid.indexOf( obj.basis ) < 0 ? `${objid}.$title = "${objid}[${obj.basis}]"` : `${objid}.$title = "${objid}"`)
	if (state.tree_parent_id && !obj.skip_attach) {
		  // древовидная иерархия.. но там объекты у нас могут путешествовать туды сюды
		 // F-TREE
	    bindings.push( `if (${state.tree_parent_id}.is_tree_element && ${objid}.is_tree_element) ${state.tree_parent_id}.append(${objid})` )
  }
  // оказалось что нам надо пропускать append но делать attach_anonymous
  // используем для этого struc_parent_id (оно вроде как по смыслу то что надо)
  if (state.struc_parent_id && !obj.skip_attach) {
		 // вторая иерархия, статическая на момент создания

  		 // для tree: tree_node решил сделать таки чтобы не анонимно добавляли
  		 // F-TREE
  	    let anonymous_mode = obj.name_is_autogenerated ? true : false
  	    if (anonymous_mode)
	      strs.push( `CL2.attach_anonymous( ${state.struc_parent_id}, ${objid})` )
		 else
		   strs.push( `CL2.attach( ${state.struc_parent_id}, "${obj.$name}", ${objid})`)
  }

  // теперь надо бы детей
  // это теперь не актуально, т.к. чилдрен идет обычным параметром
  /*
	let c_state = modify_parent( state, children_param ? 'arg_obj' : objid )
	let children_code = objs2js( get_children(obj),c_state )

	if (children_code.length > 0)
	{
		if (children_param) {
			// F-CHILDREN-BLOCK
			let strs_c = []

			// F-CHILDREN-BLOCK-PARAMS
			let xtra = ''
			if (get_children_head(obj)) {
				xtra = ', ' + get_children_head(obj).attrs.join(",")
			}

			strs.push( "// children param",`let ${objid}_children = CL2.mark_block_function( (arg_obj${xtra}) => {`,children_code," } )" )
			strs.push( `${objid}.${children_param}.set( ${objid}_children )`)
			
		}
		else
		{
			strs.push( "// outer children",children_code )
	  }
	}
	*/

	strs.push( strs2 ) // rest-накопления
	
	for (let k in bindings_hash) {
		//let link = obj.links[k]
		let linkstr = `${objid}.release.once( CL2.create_binding( ${bindings_hash[k]}, ${objid}.${internal_name(k)} ).unsub ) // hehe objid=${objid} prefix=${state.prefix}`
		bindings.push( `//bindings from ${objid}`,linkstr )
	}

	if (state.next_obj_cb) { // F-CHAINS-V3
		state.next_obj_cb( obj, objid, strs, bindings, bindings_hash_before_rest, basis_record )
	}
	if (state.next_obj_cb2) { // F-TASKS
		state.next_obj_cb2( obj, objid, strs, bindings, bindings_hash_before_rest, basis_record )
	}	

	// и фичеры.. это у нас дети которые не дети	
	// их важно делать после state.compute_mode
	if (C.get_nested(obj)) {
		strs.push( `// nested objs of ${objid}`)
		let mod_state = C.modify_parent(state,objid)
		//let mod_state = modify_prefix( modify_parent(state,obj), `${state.prefix}${obj.$name}` )
		//strs.push("{") // нужна своя область видимости чтобы идентификаторы не путались..
		let fl_objs = C.objs2objs( C.get_nested(obj), state )

		for (let f of fl_objs) {
			let o = C.one_obj2js_sp( f, mod_state )
			strs.push( o.main )
			//bindings.push("// bindings from feature-list")
			bindings.push( o.bindings )
		}
		//strs.push("}")
		
		//let f_code = objs2js( obj.features_list )
		//strs.push( f_code )
	}

	if (output_binding) {
		let linkstr = `${objid}.release.once( CL2.create_binding( ${objid}.output, ${output_binding} ).unsub )`
		bindings.push( `// output binding of ${objid}`,linkstr )
	}

	return {main:strs,bindings, obj_id: objid}
}

function obj_str( str ) {
	if (/\r|\n/.exec( str )) return "`" + str.replaceAll("`","\\`") + "`"
	return "'"+str.replaceAll("'","\\'")+"'"
}

export function objToString(obj, ndeep, state,parent_obj ) {
  if(obj == null) { return String(obj); }

  // todo это навылет
      if (obj.this_is_env_list) return paramEnvToFunc( obj, state)

  if (obj.code && obj.pos_args) return value_to_arrow_func( obj,state,parent_obj )
  if (obj.link && obj.from) return obj.from // F-STATIC-VALUES

  switch(typeof obj){  	
    case "string": return obj === "CL2.NOVALUE" ? obj : obj_str(obj);
    case "function": return obj.name || obj.toString();
    case "object":
      var indent = Array(ndeep||1).join('\t'), isArray = Array.isArray(obj);
      return '{['[+isArray] + Object.keys(obj).map(function(key){
      	   if (isArray) return objToString(obj[key], (ndeep||1)+1,state,parent_obj)
           return indent + key + ': ' + objToString(obj[key], (ndeep||1)+1,state,parent_obj);
         }).join(',') + '}]'[+isArray];
    default: return obj.toString();
  }
}

import * as COMPUTE from "../compute/compute.js"
export function value_to_arrow_func( code,state,parent_obj ) 
{
	// ссылки типа @funcname - резолвим прямо на funcname
	code = code?.from ? code.from : code

	// F-SKIP-RETURN-SCOPE
	//let insert_return_scope = {"if":true,"else":true}[ parent_obj?.basis ] ? false : true
	let insert_return_scope = true // F-FUNC-EXIT

  code = COMPUTE.cocode_to_code( code,state,insert_return_scope )

	// обработка формы {: :} но вообще это не так уж и ортогонально..
	if (code.code && code.pos_args)
		code = `(${code.pos_args.join(',')}) => { ${code.code} }`

	return code	
}