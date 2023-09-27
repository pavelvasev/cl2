import * as P from "./lang-parser.js"

// работа с состоянием
/* роль состояния:
   - хранить считанные определения, чтобы их потом использовать для проверки сигнатур вызова
   и для компиляции. 
   поле env - всегда доступные определения
   поле current - определения текущего модуля.
	 - хранить текущий родительский объект
	 - хранить точки сопряжения
   space - таблица передачи управления. плагины стыкуются сюда.
   //tool - методы компиляции уровня tool

   по сути это три разных направления деятельности просто удобно оказалось их совместить.

   поля:
     dir - каталог в файловой системе текущего компилируемого модуля.
     static_values см F-STATIC-VALUES
     tree_parent_id  - используется для append/attach
     struc_parent_id - используется для генерации исходящих ссылок для выражений
     import_map - таблица преобразований вида id -> dir для работы инструкций import в рамках текущего модуля
     modules_conf - конфигурации загруженных модулей (init-файлы)
     generated_ids - список сгенерированных объектов на текущем уровне вложенности. Надо для F-RETVAL-LAST
        // да и для child_mode функций тоже
*/

export function create_state( env={}, current={},dir="", tool ) {
	return { env, current, struc_parent_id:null, tree_parent_id: null, 
	   dir, prefix:'', space:{}, static_values: {}, tool, 
	   import_map: {}, modules_conf: {},
	   generated_ids: [] }
}

export function modify_prefix( state={}, new_prefix )
{	
	let ns = {...state, prefix: new_prefix}
	return ns
}

export function modify_parent( state={}, nv, nv2=nv )
{	
	let ns = {...state, 
	    struc_parent_id:nv, 
	    tree_parent_id: nv2, 
	    static_values: {...state.static_values}, // чтобы вложенные функции оставались внутри
      current: {...state.current}, // вложенные определения чтобы оставались внутри
	    next_obj_cb: null,
	    generated_ids: [] }
	return ns
}

export function modify_dir( state={}, nv )
{	
	let ns = {...state, current: {}, static_values: {}, dir:nv}
	return ns
}

// меняем основные формы
export function modify_env( state={}, nv )
{	
	let ns = {...state, env: {...state.env,...nv}}
	return ns
}

///////////////////// работа с obj

export function get_children(obj,children_param) {
	if (children_param == null) return []
	let v = obj.params[ children_param ]
	if (v?.cofunc)
		return v.code 
	return []
	
	//return Object.values( obj.children )
}

// children_env = children(т.е. body) + head
export function get_children_head( obj ) {
	return obj.children_env_args
}

export function get_params(obj) {
	return obj.params
}

export function get_nested( obj ) {
	return obj.features_list
}

// basis? basis-path? feature-list? (как назвать то его правильно.. args children? expr?..)


// вход 
// строка код на cl2, базовый урль.. (зачем?)
// выход obj-описание. которое есть объект с полем children
//
export function code2obj( str, base_url="?" )
{
	// todo переделать в функцию с кешированием. а то дорого каждый раз сплит-ать
	let grammarSource = {lines:str.split("\n")}

	try {
		let parsed = P.parse( str,{base_url,grammarSource,tracer:{
			trace: (obj) => { console.log("trace:",obj)}
		}} )
		//console.log("parsed=",parsed)
		//return get_children( parsed )
		return Object.values(parsed.children)
	} catch (e) {
      console.log("parser err")
      //env.emit("error",e)
      //env.emit("finished",e)
      console.error(e);
      if (typeof e.format === "function")
          console.log( e.format( [{text:str,source:grammarSource}] ));
		
	}
}

// особые формы 1го уровня это синтаксические на уровне pegjs
// особые формы 2го уровня это обработка массива записей, возможно состыковано с языковыми
// хотя быть может удобнее сделать и на уровне уже генерации строчки
/* ну т.е. реально вопрос, нужны ли эти штуки.. это же 2 прохода при компиляции каждый раз
   а может оно и там прокатило бы.. */
// особые формы 3го уровня генерируют уже текст..
// ну и вот их, 2 и 3, можно кажется состыковать, чтобы не путаться
// сообразно 2е умеют преобразовывать вход ... а 3и это финальные...
// ну и 2я преобразовала и надо рестартовать процесс с нее же..
export function objs2obj( objs )
{
	return objs; // пока так..

	//console.log("objs2obj called",objs)
	for (let i=0; i<objs.length; i++)
		obj2obj( objs[i], objs, i)
	return objs
}

export function obj2obj( obj, objs, index )
{	
	//console.log( "obj2obj, basis=",obj)
	/*
	if (obj.basis == "else_old") {
		//console.log("CATCHED ELSE",obj)
		obj.basis = "nop"
		obj.basis_path = ["nop"]
		let if_record = objs[ index-1 ]
		//console.log("if record is", if_record)
		if (obj.params.hasOwnProperty('0')) { // else some
			if_record.params.else_value = obj.params[0]
			if (obj.links.hasOwnProperty('0')) { // else @k
				/// ето ссылка
				if_record.links.else_value = obj.links[0]
				if_record.links.else_value.to = "else_value"
				if_record.features_list ||= []
				if_record.features_list.push( obj.features_list[0] )
			}
		} else {
		  //else console.error('else: no param or {}-unsupported feature')
		  let v = Object.values( obj.children )
		  v.this_is_env_list = true
		  v.env_args = obj.children_env_args
		  // todo сделать чилдренов такими же как значение параметров
		  // т.е. это массив вот с ключами дополнительными
		  if_record.params.else_value = v
		}
	}
	*/
}


// возвращает запись из текущего окружения определения по идентификатору id
export function get_record(state,id,obj_info,allow_defaults=true) {
	//console.log("get_Record",id,obj_info)

	let id_arr = Array.isArray(id) ? id : id.split(".")

	if (id_arr.length == 1) { // просто имя вида имя
		let x = state.current[id_arr[0]] // временный тупняк
		if (x)
			return x

		let y = allow_defaults ? state.env[id_arr[0]] : false
		if (!y) {
			console.error("env have no basis record for basis=",id)
			//console.error("state.env=",state.env,"allow_defaults=",allow_defaults)
			console.error(obj_info?.locinfo)
			console.error(obj_info)
			//console.error("env=",state.env)
			throw new Error( `env have no basis: ${id}`)
		}
		return y
  }

  let next_state = get_record( state, id_arr[0], obj_info, false )

  if (next_state == null) {
  	console.error("current_state=",state)
  	throw new Error(`get_record: name part ${id_arr[0]} cannot be resolved in current state`)
  }

  return get_record( next_state, id_arr.slice(1), obj_info, false) // todo slice дорого, надо индекс передавать
}

// F-ALIAS
function get_basis( record ) {
	return record.basis
}

// вход obj-описание  т.е. массив записей от парсера
// выход вложенный массив строк на javascript
// objs - массив описаний
// state - состояние компилятора. в него записываются прочитанные определения новых типов
//  т.е. оно служит и окружением компилятора. см state.current
// todo выделить эту штуку до мержа со строчками. и использовать всюду. и добавить каллбеку.
export function objs2js( objs,state )
{
	//console.log("gonna make js for",objs)
	//console.log("state is",state)
	let strs = []
	let bindings = []
	//console.error("going via objs=",objs)
	//console.trace()

	objs = objs2obj( objs ) // особые формы 2го уровня применяем

	for (let k of objs) //todo массив там..
	{
		let o = one_obj2js_sp( k, state )
		//console.log("o=",o)
		strs.push( o.main )
		bindings.push( o.bindings )
	}
	//console.log("strss=",strs,"bindings=",bindings.flat())
	//let s = strs.join("\n") + "\n// bindings\n" + bindings.flat().join("\n")
	if (bindings.length > 0)
	{
		//strs.push( "//bindings." ) //" len="+bindings.length + bindings.toString())
		strs.push( ...bindings.flat() )
	}
	return strs
}

export function strarr2str( arr,padding="",extra_ending="\n" ) {
	let str = ''
	for (let k of arr) {
		if (Array.isArray(k))
			str += strarr2str( k,padding + "  ","" ) + extra_ending
		else
			str += padding + k + "\n"
	}
	return str
}


export function one_obj2js_sp( obj, state )
{
	//console.error("gonna make js for",obj)
	let env_rec = get_record(state,obj.basis_path, obj)
	if (env_rec?.make_code)
		return env_rec.make_code( obj, state )
	//return one_obj2js( obj,state )
	console.error(`record ${obj.basis} have no make_code!`)
	console.error( 'record=',env_rec )
	throw new Error(`record ${obj.basis} have no make_code!`)
}

export function obj_id( obj, state ) {
	return `${state.prefix}${obj.$name}`
}

export function default_obj2js( obj,state ) {
	//console.log("default_obj2js",obj)
	//let objid = varcoutner++
	let basis = obj.basis
	// проверим параметр
	let basis_record = get_record(state,obj.basis_path, obj) // пусть уш передают тогда?

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
	let {normal, renamed, pos_rest,named_rest,children_param} = basis_record.check_params( assigned_names, obj.locinfo )
	
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

	let objid = obj_id( obj, state )
	let strs = [`/// object ${objid}`]
	let strs2 = []
	state.generated_ids.push( objid )

	let bindings_hash_before_rest = {...bindings_hash} // надо для compute_mode

	//console.log({pos_rest,named_rest})
	if (pos_rest.name) {
		let rest_name = `${objid}_${pos_rest.name}`
		if (pos_rest.length > 0) {			
			bindings_hash[ pos_rest.name ] = rest_name
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
			//init_consts[ pos_rest.name ] = pos_cells
		} else {
			init_consts[ internal_name(pos_rest.name) ] = []
		}
  }

  // F-NAMED-REST
  if (named_rest.name) {
  	//console.log("see named rest!",named_rest.name,"names=",...named_rest,named_rest.length)
  	let named_rest_name = `${objid}_${named_rest.name}`
  	if (named_rest.length > 0) {
  		bindings_hash[ named_rest.name ] = named_rest_name

  		let named_cells = {}
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

  	}
  	else {
  		init_consts[ internal_name(named_rest.name) ] = {}
  	}
  }

	////////////

	// init_consts["parent"] = state.struc_parent?.$name || "self"
	let obj_title = objid.indexOf( obj.basis ) < 0 ? `${objid}[${obj.basis}]` : `${objid}`
	init_consts['$title'] = obj_title
	
  strs.push( `let ${objid} = ${obj.modul_prefix}create_${get_basis(basis_record)}( ${objToString(init_consts,1,state,obj)} )`)
  // тоже чтобы можно было на него ссылаться напрямую, по значению
  state.static_values[ objid ] = true

	//strs.push( objid.indexOf( obj.basis ) < 0 ? `${objid}.$title = "${objid}[${obj.basis}]"` : `${objid}.$title = "${objid}"`)
	if (state.tree_parent_id) {
		  // древовидная иерархия.. но там объекты у нас могут путешествовать туды сюды
	    strs.push( `${state.tree_parent_id}.append(${objid})` )	    
  }
  // оказалось что нам надо пропускать append но делать attach_anonymous
  // используем для этого struc_parent_id (оно вроде как по смыслу то что надо)
  if (state.struc_parent_id) {
		  // вторая иерархия, статическая на момент создания
	    strs.push( `CL2.attach_anonymous( ${state.struc_parent_id}, ${objid})` )
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
	if (get_nested(obj)) {
		strs.push( `// nested objs of ${objid}`)
		let mod_state = modify_parent(state,objid)
		//let mod_state = modify_prefix( modify_parent(state,obj), `${state.prefix}${obj.$name}` )
		//strs.push("{") // нужна своя область видимости чтобы идентификаторы не путались..
		let fl_objs = objs2obj( get_nested(obj) )

		for (let f of fl_objs) {
			let o = one_obj2js_sp( f, mod_state )
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

	return {main:strs,bindings}
}

function obj_str( str ) {
	if (/\r|\n/.exec( str )) return "`" + str.replaceAll("`","\\`") + "`"
	return "'"+str+"'"
}

export function objToString(obj, ndeep, state,parent_obj ) {
  if(obj == null) { return String(obj); }
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

/// todo убрать это
export function paramEnvToFunc( value, state ) {
	if (!state)
		throw new Error("paramEnvToFunc: state is not defined")
	let c_state = modify_parent( state, 'arg_obj' )
	let children_code = objs2js( value,c_state )
			let xtra = ''
			if (value.env_args) {
				xtra = ', ' + value.env_args.attrs.join(",")
			}	
	let s = `CL2.mark_block_function( (arg_obj${xtra}) => { ${strarr2str(children_code)} } )`
	return s
}

import * as COMPUTE from "../plugins/compute/compute.js"
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
