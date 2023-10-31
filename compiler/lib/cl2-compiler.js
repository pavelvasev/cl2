import * as P from "./lang-parser.js"

import * as CL2 from '../../platform/js/runtime/cl2.js';

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
	return { env, current, 
	   is_state: true,
	   struc_parent_id:null, tree_parent_id: null, 
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


// вход:
// выход: новый массив objs, и новый счетчик откуда продолжать движение
// выход: список объектов = результат работы модификатора, и i где он остановился.
/*
function process_modifier( i, objs, state ) {
	if (i >= objs.length) return [i,[]]
	if (!objs[i].macro_call) return [i,[]]

	let next = process_modifier( i+1, objs )

	let env_rec = get_record( state,obj.basis_path, obj, true, false )	
}
*/
/*
function create_interpreter( state ) {
	// https://stackoverflow.com/questions/67322922/context-preserving-eval
	var __EVAL = s => eval(`void (__EVAL = ${__EVAL.toString()}); ${s}`);
	let fn_code = `
	return ( code ) => {
		console.log("interpreter called",code)
		
		let arr = []
		CL2.setStartPerformScheduled(f => {
			arr.push( f )
		})

		//let self = {}

		let res = __EVAL( code )

		while (arr.length > 0) {
			console.log("i-tick ",arr.length)
			let f = arr.shift()
			f()
		}

		return res
	}`
	let fn = new Function( 'CL2','self','__EVAL',fn_code )
	return fn( CL2, {},__EVAL )
}
*/

// todo если этот слой останется то утащить его в плагин
function create_interpreter( state ) {
	// https://stackoverflow.com/questions/67322922/context-preserving-eval
	var __EVAL = s => eval(`void (__EVAL = ${__EVAL.toString()}); ${s}`);
	
	return ( code ) => {
		//console.log("interpreter called",code)
		
		let arr = []
		CL2.setStartPerformScheduled(f => {
			arr.push( f )
		})

		//let self = {}

		let res = __EVAL( code )

		while (arr.length > 0) {
			//console.log("i-tick ",arr.length)
			let f = arr.shift()
			f()
		}

		return res
	}
	//let fn = new Function( 'CL2','self','__EVAL',fn_code )
	//return fn( CL2, {},__EVAL )
}

// F-MACROS
export function objs2objs( objs, state, one_tick )
{

	let i = 0;

/* не понял как выяснять что там объект с .output-ом есть
	let compiler_program = []
	while (i < objs.length) {
		let obj = objs[i]
		if (obj.macro_call) {
			compiler_program.push( obj )
		}
	}
*/	

	let compiler_program = { main: [], bindings: []}
	let j = 0;
	let next_objs = []
	let points = []

	// он у нас будет общий на весь модуль текущий..
	if (!state.compiler_program_state) {
		state.compiler_program_state = modify_dir(state,"./");
		state.compiler_program_state.struc_parent_id = "self"

		//state.compiler_program_state.space.get_export_flag

		state.compiler_program_interpreter = create_interpreter()
		state.compiler_program_interpreter('let self={}')
		state.compiler_program_interpreter( state.space.default_things_code )

		//console.log("testing interp")
		//state.compiler_program_interpreter("create_read()")
	}

	let substate = state.compiler_program_state
	let interpreter = state.compiler_program_interpreter

	while (i < objs.length) {
		let obj = objs[i]
		if (obj.basis == "%") {
			let items = get_children(obj,0)
			//obj = objs[i+1] 
			//console.log("macro call",obj,"items=",items)

			if (items.length > 0) {
				// запись вида % { commands }
				let r = process_objs( items, substate )
				//compiler_program.main.push( r.main )
				//compiler_program.bindings.push( r.bindings )
				interpreter( strarr2str( r.main.concat( r.bindings )) )
				j++
				// съедим инструкцию
				objs.splice( i, 1)
				continue;
			}
			else {
				// запись вида % command
				obj = objs[i+1]

				let env_rec = get_record( substate,obj.basis_path, obj, true, false )
				if (!env_rec) {
					console.error("compiler-lang: no env record for basis",obj.basis_path)
				}
				let r = env_rec.make_code( obj, substate )
				//compiler_program.main.push( r.main )
				//compiler_program.bindings.push( r.bindings )
				// console.log("r-obj-id",r.obj_id, r)
				let new_code = []
				if (r.obj_id) {
					// там будет результат
					r.bindings.push( `${r.obj_id}.output`)
					let res = interpreter( strarr2str( r.main.concat( r.bindings )))
					if (res.is_set) {
						let rr = res.get()
						//console.log("compiler-lang: waited res=",rr)
						if (rr.code) {
							// круто дали новый код
							new_code = rr.code
						} else if (Array.isArray(rr) && rr[0].code)
						   new_code = rr.map( item => item.code ).flat()
						else {
							//console.log("parsing rr",rr)
							let parsed = state.tool.parse( rr.toString() )
							//let parsed = state.tool.parse( `comment 'compiler-lang begin' ${rr}` )
							//console.log("parsed=",parsed)
							parsed[0].$name = objs[i].$name // вот так							
							new_code = parsed
							//state.tool.compile_string
							/* это рид
								let nc = objs[i]
								nc.basis = "read"
								nc.basis_path = ["read"]
								nc.params[0] = rr
								new_code = [nc]							
							*/	
						}   
					} else {
						console.error("compiler-lang: no result",res)
					}
					j++
				} else 
					interpreter( strarr2str( r.main.concat( r.bindings )))

				//i++ // съедаем следующую команду
				objs.splice( i, 2, ...new_code)
				continue;
			}
		} else {
			//next_objs.push( obj )
			//points.push( CL2.create_cell( obj ) )
		}
		i++
	}
	//console.log("Sborka finish, j=",j,objs.length)

	
	/*
	/// слой модификаторов
	while (i < objs.length) {
		let obj = objs[i]
		//console.log(obj)

		if (obj.basis == "modifier") {
			let env_rec = get_record( state,obj.basis_path, obj, true, false )
			env_rec.make_code( obj,state )
			objs.splice( i, 1 )
			continue;
		}

		if (obj.macro_call) {
			//console.log("mmm",obj.basis)

			let env_rec = get_record( state,obj.basis_path, obj, true, false )
			if (!env_rec) {
				console.error("objs2obj: cannot find modifier id=",obj.basis)
			}
			//console.log("mmm",obj.basis)

		   let params_count = obj.positional_params_count
  			let last_param = obj.params[ params_count-1 ]

  			let target_objs
  			// вариант %name {}
  			//console.log("mmm",obj.basis)
  			let i_processed = 1
  			if (last_param?.code) {
  				// надо выкусить
	  			obj.params[ params_count-1 ] = null
  				obj.positional_params_count--

  				target_objs = objs2objs( last_param.code, state )
  				//objs.splice( i,1,...target_objs )
  				params_count--
  			} else {
  			 // вариант %name %name ...
  			 console.log("case. calling with limit 1! ",objs.slice(i+1) )	
		    let next_objs = objs2objs( objs.slice(i+1), state, 1 )
		    console.log("case. next_objs=",next_objs)
		    i_processed = next_objs.i_processed

		    // там может и 1 операция была, но вида %alfa { ... }
		    // и тогда next_objs нам вернут много
		    target_objs = next_objs
		    // выкусим себя и разместим подстановку
		    //objs = objs.slice( 0,i ).concat( next_objs )    
		  }
		  //console.log("mmm",obj.basis)

		  //console.log("macro call! targts=",target_objs)

		  let modified_objs = []
    	  for (let next_obj of target_objs) {
    	  	 let res = env_rec.modify( obj, next_obj, state )
    	  	 
    	  	 //if (!res) continue;
    	  	 //if (Array.isArray( res )) modified_objs.push( ...res )
    	  	 //	else
    	  	 
    	  	 modified_objs.push( res )
    	  }

    	  objs.splice( i, i_processed, ...modified_objs )

    	  continue;	
  		}
  		i++
	}
	*/
	

	let i_processed = i;

	//console.log("converted=",objs)

	// todo генераторам (или как их там) надо уметь вызвать процесс преобразования
	// после себя (т.е. objs2obj) -  чтобы например реализовать цепочки декораторов.

	// слой трансформаторов

	i = 0;
	while (i < objs.length) {
		let obj = objs[i]
		//console.log("obj.basis_path=",obj.basis_path,obj)
		let env_rec = get_record( state,obj.basis_path, obj, true, false )
		if (env_rec?.transform) {
			 //console.log("transform found! i=", i, env_rec)
			 let result = env_rec.transform( i, objs, state )
			 //console.log("===== result=",result)
			 // возвращает: 1) на что заменила next_record, список, 2) на что заменила objs
			 // ну на самом деле то есть заменяет objs в некотором смысле
			 objs = result[1]
			 i = result[0]

			 if (!objs) {
			 	console.error("transform returned null objs!")
			 }
			 if (!Array.isArray(objs)) {
			 	console.error("transform returned not array of objs! transform name:",obj.basis)	
			 }
			 // todo - тут можно зациклиться
		} else {
			i++
		}
	}

	objs.i_processed = i_processed;

	//console.log("after transform, objs=",objs)
	return objs; // пока так..

	//console.log("objs2obj called",objs)
	// это поштучная версия
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
export function get_record(state,id,obj_info,allow_defaults=true, error_if_not_found=true) {
	//console.log("get_Record",id,obj_info)

	let id_arr = Array.isArray(id) ? id : id.split(".")

	if (id_arr.length == 1) { // просто имя вида имя
		let x = state.current[id_arr[0]] // временный тупняк
		if (x)
			return x

		let y = allow_defaults ? state.env[id_arr[0]] : false
		if (!y) {
			if (error_if_not_found) {
				console.error("env have no basis record for basis=",id)
				//console.error("state.current=",state.current)
				//console.error("state.env=",state.env,"allow_defaults=",allow_defaults)
				console.error(obj_info?.locinfo)
				console.error(obj_info)
				//console.error("env=",state.env)
				throw new Error( `env have no basis: ${id}`)
			}
		}
		return y
  }

  // запросим стейт для первой части
  // ну мы полагаем что там - окружение. поэтому там стейт. см F-IMPORTED-STATE
  let next_state = get_record( state, id_arr[0], obj_info, false, error_if_not_found )
  //console.log("next_state=",next_state)

  if (!next_state) {
  	if (error_if_not_found) {
  		console.error("current_state=",state)
  		throw new Error(`get_record: name part ${id_arr[0]} cannot be resolved in current state`)
  	}
  	return null
  }

  // и перейдем в этот стейт, запрашивая оставшиеся части
  return get_record( next_state, id_arr.slice(1), obj_info, false, error_if_not_found) // todo slice дорого, надо индекс передавать
}

// F-ALIAS
export function get_basis( record ) {
	return record.basis
}

// результат - запись вида { main: ..., bindings: ... }
export function process_objs( objs,state )
{
	//console.log("gonna make js for",objs)
	//console.log("state is",state)
	let strs = []
	let bindings = []
	//console.error("going via objs=",objs)
	//console.trace()

	objs = objs2objs( objs, state ) // особые формы 2го уровня применяем

	//sconsole.log("objs=",objs)

	for (let k of objs) //todo массив там..
	{
		let o = one_obj2js_sp( k, state )
		//console.log("o=",o)
		strs.push( o.main )
		bindings.push( o.bindings )
	}
	return {main: strs, bindings }
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
	let base = process_objs( objs,state )
	//console.log('base=',base)

	let strs = base.main
	if (base.bindings.length > 0)
	{
		//strs.push( "//bindings." ) //" len="+bindings.length + bindings.toString())
		//strs.push( ...base.bindings.flat() )
		strs.push( ...base.bindings )
	}
	//console.log(strs)
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

	//if (env_rec?.is_state)
//		throw new Error("note: seems you use name of module!")

	//return one_obj2js( obj,state )
	console.error(`record ${obj.basis} have no make_code!`, obj.locinfo)
	//console.error( 'record=',env_rec )
	if (env_rec?.is_state)
		console.error("note: seems you use name of module!")
	throw new Error(`record ${obj.basis} have no make_code!`)
}

export function obj_id( obj, state ) {
	return `${state.prefix}${obj.$name}`
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

// вытащено из форм. может им тут не место.
// по объектовой записи объекта понять кто его параметры включая каналы
// todo добавить проверку что все необходимые значения заданы
export function get_obj_params( obj, obj_children ) {
	let params = {}
	let rest_param, named_rest_param, children_param, next_obj_param
	let const_params = {}
	let required = {} // F-CHECK-REQUIRED
	// F-CHAINS-V3 next_obj_param

	// возможность работы с несколькими in-секциями
	let ins = obj_children.filter( c => c.basis == "in")
	if (ins.length == 0) return {params}
	//console.log("ins len=",ins.length,obj)

	for (let in_p of ins) {
	//let in_p = get_children(obj,1).find( c => c.basis == "in")
	//if (!in_p) return {params}

  // вот этим шагом можно параметры будет отдельно рендерить
	//obj.in_params = in_p
	//delete obj.children[ in_p.$name ]
	
		for (let k of get_children( in_p, 0 )) {
			//console.log("checking k=",k.$name,k.basis)
			if (k.basis == "cell" || k.basis == "channel" || k.basis == "func")
			{
				params[ k.$name ] = true
				k.$name_modified = k.$name
			}
			else
			if (k.basis == "const")
			{
				params[ k.$name ] = true
				k.$name_modified = k.$name
				const_params[ k.$name ] = true
				// F-CHECK-REQUIRED
				if (!k.params.hasOwnProperty(0)) 
					required[ k.$name ] = true
			}

			if (k.$name.endsWith("**")) {
				k.$name_modified = k.$name.slice(0,-2)
				named_rest_param = k.$name_modified
				//console.log("!!! named_rest_param=",named_rest_param)
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
					params[ children_param ] = true // т.е. параметр доступен и через обычные параметры
				}
			else // получается мы всякие rest не проверяем
			// F-CHECK-REQUIRED
			// так то это хак и послезнание, что у ячейки значение в параметре 0..
			if (k.basis == "cell" && !k.params.hasOwnProperty(0))  
			    required[ k.$name_modified ] = true

		}
	}	
	
	//console.log("get-obj-params obj=",obj.$name, "in=",in_p,{params,rest_param,named_rest_param})

	return {params,rest_param,named_rest_param,children_param,next_obj_param,const_params,required}
}