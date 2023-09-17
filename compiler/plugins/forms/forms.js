// особые формы CL2 уровня кодо-генерации, для языка Javascript

import * as C from "../../lib/cl2-compiler.js"

export function init( state ) {
	state.env = {...state.env,...tablica}
}

let default_cp = (assigned_names) => { return {normal: assigned_names, renamed: {}, pos_rest: [],named_rest:[]} }

export var tablica = {
	let: { make_code: _let, check_params: default_cp },
	let_next: { make_code: _let_next, check_params: default_cp },
	obj: { make_code: _obj, check_params: (assigned_names) => { 
		 return {normal: assigned_names, renamed: {'1': 'children'}, pos_rest: [],named_rest:[]} 
		} },
//	attach: { make_code: attach, check_params: default_cp },
	channel: { make_code: channel, check_params: default_cp },
//	func: { make_code: func, check_params: default_cp },
//func: { make_code: func, check_params: (assigned_names) => { return {normal: assigned_names, renamed: {}, pos_rest: [],named_rest:[], children_param: "body"} } },
	cell: { make_code: cell, check_params: default_cp },
	bind: { make_code: bind, check_params: default_cp },
	init: { make_code: _init, check_params: default_cp },
	paste: { make_code: paste, check_params: default_cp },
	in: { make_code: _in, check_params: default_cp},
//	react_orig: { make_code: react, check_params: default_cp},
	nop: { make_code: () => { return { main: [], bindings: [] } }, check_params: default_cp},
	alias: { make_code: alias, check_params: default_cp},
	assert: { make_code: assert, check_params: default_cp},
	locinfo: { make_code: locinfo, check_params: default_cp},
	pipe: { make_code: pipe, check_params: default_cp}
}

/*
  таблица env составляется из записей вида
  _id:
    check_params: ( names-list ) -> {normal, renamed,rest,named_rest, children}
    где names-list массив имен присвоенных внешним описанием,
    где в частности позиционные имена это числа, а прочие - имена.
    normal, renamed,rest,named-rest массивы тоже имен 
    - это есть указание в какие разделы кого следует отправлять.
      normal - список имен параметров которые следует передать поштучно
      renamed - 
         дополнительная таблица переименования (используется для присвоения позиционных в имена)
         вида external-name -> internal-name
      rest - список имен которые записать в rest
      named-rest - список имен которые записать в named-rest
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

	// так надо а то они думаю что там родитель есть.. хотя он вроде как и не нужен тут..
	// todo тут надо просто правильно выставить tree_parent_id / struc_parent_id
	base.main.push( `let ${C.obj_id(obj,state)} = CL2.create_item()`)

	//  и фичеры.. это у нас дети которые не дети	
	if (C.get_nested(obj)) {
		let mod_state = C.modify_parent(state,obj.$name)
		for (let f of C.get_nested(obj)) {
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
		let val_str = val?.from ? "CL2.NOVALUE" : C.objToString(val,0,state)
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

// F-LET-NEXT
export function _let_next( obj, state )
{
	let name = obj.params[0]
	let strs = []
	let s = `let ${name} = CL2.create_cell(); ${name}.$title='${name}'`
  strs.push( s )
  //console.log('let-next ',name,'state.struc_parent_id=',state.struc_parent_id,state.tree_parent_id)
  if (state.struc_parent_id) {
  	strs.push( `CL2.attach( ${state.struc_parent_id},"${name}",${name} )`)
  }

	let prev = state.next_obj_cb
	//console.log("installin NEXT OBJ PARAM for",self_objid)
	state.next_obj_cb = (obj2,objid2,strs,bindings,bindings_hash_before_rest) => {
		bindings.push( `CL2.create_binding( ${objid2}.output, ${name} ) // from let_next` )
		state.next_obj_cb = prev
		//console.log('CASE, prev restored',prev+"","calling it, str=",strs)
		if (state.next_obj_cb)
			state.next_obj_cb(obj2,objid2,strs,bindings,bindings_hash_before_rest)
	}

	// надо отключить если было включено
	state.static_values[ name ] = false


	return {main: strs, bindings: []}
}

// по объектовой записи объекта понять кто его параметры включая каналы
export function get_obj_params( obj ) {
	let params = {}
	let rest_param, named_rest_param, children_param, next_obj_param
	// F-CHAINS-V3 next_obj_param

	let in_p = C.get_children(obj,1).find( c => c.basis == "in")
	if (!in_p) return {params}

  // вот этим шагом можно параметры будет отдельно рендерить
	//obj.in_params = in_p
	//delete obj.children[ in_p.$name ]
	
		for (let k of C.get_children( in_p, 0 )) {
			//console.log("checking k=",k.$name,k.basis)
			if (k.basis == "cell" || k.basis == "channel" || k.basis == "func")
			{
				params[ k.$name ] = true
				k.$name_modified = k.$name
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
	let s = C.objs2js( C.get_children(obj,0),state )
	//console.log("in called. result=",base)
	return { main: ["// input params",s,"// end input params"], bindings:[] }
}


/* 1 вводит в окружение новую форму с указанным именем xxx.
   при обращении к форме - генерируется текст создания объекта 
   (в котором вызывается функция создания объекта - create_xxx)
   2 вводит в генерируемый текст текущего модуля исходный код 
   функции создания объекта create_xxx
   
*/
export function _obj( obj, state )
{
	//console.log("obj=",obj)
	// чет я не очень понял зачем вызывать one_obj2js...
	//let base = C.one_obj2js( obj,state )
	let base = { bindings: []	}

	//let strs = []
	let id = obj.params[0] || obj.$name
	//let s = `export function create_${id}( initial_values )`
	//strs.push(`/// type ${id}`,s,"{")

	let strs2 = []
	strs2.push(`let self=CL2.create_item(); self.$title=initial_values.$title`)
	// чтобы можно было давать ссылки на self
	state.static_values[ 'self' ] = true
	//strs2.push(`let self=CL2.create_item()`)

	// todo передалать. но тут тупорого - мы удаляем просто позиционные
	let {params,rest_param,named_rest_param, children_param,next_obj_param} = get_obj_params( obj )
	//console.log("get-obj-params:",{params,rest_param,named_rest_param})
	let obj_params = params
	let positional_names = Object.keys(params)
	let starting_rest = positional_names.findIndex( id => id.endsWith("*"))
	if (starting_rest >= 0)
		positional_names = positional_names.slice( 0, starting_rest )

  ///////////////// генерируем тело указанное в 1-м аргументе

	let c_state = C.modify_parent( state, "self" )
	let body = C.objs2js( C.get_children( obj,1 ), c_state )
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
		basis: id,
		is_obj: true,
		obj_record: obj,
		make_code: (obj,state) => { 
			let self_objid = C.obj_id( obj, state )
			let res = C.default_obj2js(obj,state)

			// F-CHAINS-V3, todo optimize if вынести
			if (next_obj_param) {
				let prev = state.next_obj_cb
				//console.log("installin NEXT OBJ PARAM for",self_objid)
				state.next_obj_cb = (obj2,objid2,strs,bindings,bindings_hash_before_rest) => {
					//console.log("NEXT OBJ PARAM check",objid2,next_obj_param)
					if ("_" + obj2.basis == next_obj_param) {
						//console.log("NEXT OBJ PARAM",objid2)
						strs.push( `${self_objid}.${next_obj_param}.set( ${objid2} )` )
						//console.log("popping state.generated_ids",state.generated_ids)
						state.generated_ids.pop() // съели
						//console.log("so state.generated_ids",state.generated_ids)
					}
					state.next_obj_cb = prev
					//console.log('CASE, prev restored',prev+"","calling it, str=",strs)
					if (state.next_obj_cb)
						state.next_obj_cb(obj2,objid2,strs,bindings,bindings_hash_before_rest)
				}
			}
			
			return res
		},
		check_params: ( param_names, locinfo ) => {
			//console.log("check_params of id",id,"param_names=",param_names,"obj_params=",obj_params)
			// задача - по каждому указанному входному параметру дать информацию
			// как его следует подавать
			// - как именованный (и как именно - это касается позиционной подачи)
			// - в рест позиционный - в рест именованный (и какое имя)

			/* возвращает словарь: 
			   named - список имен которые следует передать обычным образом
			   renamed - словарь преобразования имен
			   pos_rest_names - список имен которые следуте записать в rest-параметр
			   named_rest_names - список имен которые следуте записать в named-rest-параметр
				 children_param - имя параметра для записи функции добавки детей 
			*/
			let named = [], pos_rest_names = [], named_rest_names=[]
			let renamed = {}
			pos_rest_names.name = rest_param
			named_rest_names.name = named_rest_param
			// obj_params это словарь параметров из описания объекта (типа то бишь)
			// positional_names - массив имен позиционных параметров из описания
			for (let k of param_names) {
				// k - имя очередного параметра указанное внешне. может быть числом, для позционных.				
				if (obj_params.hasOwnProperty( k )) {
					// k встречается в списке параметров объекта - значит это именованный
					named.push( k )
					continue
				}
				
				let qq = positional_names[k] // F-POSITIONAL-RENAME
				if (obj_params.hasOwnProperty( qq )) {
					// k есть позиционный параметр. запомним как его надо переименовать при присвоении
					named.push( k )
					renamed[k] = qq
					continue
				}
				// есть рест и обычные - заполнены
				// и при этом имя параметра это число. todo как-то отдельно эти бы числа просто пройти..
				if (rest_param && named.length == positional_names.length && /^(0|[1-9]\d*)$/.test(k)) {
					pos_rest_names.push( k )
					// todo но это только если k - позиционно подан
					continue // временное название для **
				}
				if (named_rest_param) {
					named_rest_names.push( k )
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

/*
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
*/


export function cell( obj, state )
{
	let name = obj.$name_modified || obj.$name

  let initial_value = 'CL2.NOVALUE'
  let p0 = obj.params[0]
  if (p0 != null) {
  	if (typeof(p0) == 'object' && p0.link) {
  		initial_value = p0.from
  	}
  	else {  		
  	  initial_value = C.objToString(p0)  	
  	}
  } 

	let value_str = `initial_values.hasOwnProperty('${name}') ? initial_values.${name} : ${initial_value}`

	let strs = [`let ${name} = CL2.create_cell(${value_str})`]
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

export function _init( obj, state )
{
	let strs = []
	
	strs.push( `let init = `,C.value_to_arrow_func(obj.params[0],state),`init(${state.tree_parent_id})` )

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
/*
export function func( obj, state )
{
	let name = obj.$name_modified || obj.$name
	let fn_code = obj.params[0]

	if (obj.params[1]) { // вариант func "name" code
		name = obj.params[0]
		fn_code = obj.params[1]
	}
	// F-SAFE-NAME
	//let original_name = name
	//name = C.name_to_safe_name(name)
	
	let strs = [`function ${name}(${fn_code.pos_args.join(',')}) { ${fn_code.code} }`]
	strs.push( `CL2.attach( self,"${name}",${name} )` )

	//state.current[ name ] - а кстати идея.. зарегать так объект..
	state.static_values[ name ] = true
	// .static_values это тема, чтобы на функцию не биндиться а как есть передавать

  // todo это надо как-то соптимизировать. по сути нам надо сгенерировать объект
  // что-то типа define_obj_from_func "${name}" ${name}
	let code = `
	 obj "${name}" {
	 	  in {
	 	  	rest*: cell
	 	  }
	 	  output: cell
	 	  vals: extract @rest
  	  r: react @vals.output {: args | return ${name}( ...args ) :}

  	  bind @r.output @output
	 }
	`

	//state.tool.compile_string( code )

	let c_obj = C.code2obj( code )
	strs.push( C.objs2js( c_obj,state ) )

	//let strs = [`function task_${name}(args) {}`]
	//strs.push( `CL2.attach( self,"${name}",${name} )` )


	return {main:strs,bindings:[]}
}
*/

export function bind( obj, state )
{
	let name = obj.$name

	let strs = [`let ${name} = CL2.create_binding(${obj.params[0].from},${obj.params[1].from})`]
	strs.push( `CL2.attach( self,"${name}",${name} )` )

	return {main:strs,bindings:[]}
}
// bind @func @ch


/* F-PIPES
   пайп сделан статический. потому что тогда он успешно подставляет input-параметры.
   а динамически это провернуть увы невозможно. 
   для динамического пайпа отдельная наработка, dynamic_pipe
*/
export function pipe( obj, state )
{
	let base = { main: [], bindings: [] }

	// так надо а то они думаю что там родитель есть.. хотя он вроде как и не нужен тут..
	// todo тут надо просто правильно выставить tree_parent_id / struc_parent_id
	let objid = C.obj_id(obj,state)
	base.main.push( `let ${objid} = CL2.create_item() // pipe`)
	base.main.push( `CL2.attach( ${objid},'input',CL2.create_cell())`)
	base.main.push( `CL2.attach( ${objid},'output',CL2.create_cell())`)

	//  и фичеры.. это у нас дети которые не дети	
	let counter = 0
	let prev_objid = objid
	let prev_from = null // `${objid}.input`
	let ch = C.get_children(obj,'children')
	//console.log("pipe children is",ch, obj)
	if (ch) {
		let mod_state = C.modify_parent(state,objid)
		for (let f of ch) {

			// правило такое:
			// сдвигаем параметры заданные позиционно вправо 
			// и output левого элемента ставим первым таким параметром.
			// ну если там был input и не совпало.. посмотрим, может ошибка.

			//let r = C.get_record( state, f.basis_path, f )
			//console.log('see record',r)
			if (prev_from) {
				let i = f.positional_params_count
				// сдвигаем
				while (i > 0) {
					f.params[i] = f.params[i-1]
					i = i-1
				}
				// ставим первый позиционный
				f.params[0] = {link:true}
				f.links[0] = {to:0,from:`${prev_from}`}
				f.positional_params_count = f.positional_params_count+1

				//// вставка готова
		  }

			let o = C.one_obj2js_sp( f, mod_state )
			base.main.push( o.main )
			//bindings.push("// bindings from feature-list")
			base.bindings.push( o.bindings )
			prev_objid = C.obj_id( f, mod_state )
			prev_from = `${prev_objid}.output`
		}
		// output последнего линкуем на output всей пайпы
		base.bindings.push(`let ${objid}_p = CL2.create_binding(${prev_objid}.output,${objid}.output)`)
	}

  if (state.next_obj_cb)
		state.next_obj_cb(obj,objid,base.main,base.bindings,{})	

	return base
}


/*
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
	if (C.get_nested(obj)) {
		let mod_state = C.modify_parent(state,obj.$name,null)
		for (let f of C.get_nested(obj)) {
			let o = C.one_obj2js_sp( f, mod_state )
			strs.push( o.main )
			//bindings.push("// bindings from feature-list")
			bindings.push( o.bindings )
		}
	}

	strs.push( `let ${name} = CL2.create_reaction(${code})`)

	//let src_param = obj.params[ Object.keys( obj.params )[0] ]
	let src_param = obj.params[0]
	let srcname = src_param.from
	
	bindings.push( `CL2.create_binding( ${srcname},${name} )` )

	return {main:strs,bindings:bindings}
}
*/

export function alias( obj, state )
{
	let original_name = obj.params[0]
	let new_name = obj.params[1]

	let q = state.current[ original_name ]

	if (!q) {
		console.error("alias: source name is not defined in state! name=",original_name)
		console.error(obj.locinfo)
	}
  
	state.current[ new_name ] = q
	//console.log("created alias: ",new_name)
	
	return { main: [], bindings:[] }
}

// что-то перебор заради одного locinfos
export function assert( obj, state )
{
	let cond = obj.params[0]
	let message = obj.params[1]
	let timeout = obj.params[2] || 1000

	// так надо а то они думаю что там родитель есть.. хотя он вроде как и не нужен тут..
	// todo тут надо просто правильно выставить tree_parent_id / struc_parent_id
	//base.main.push( `let ${C.obj_id(obj,state)} = CL2.create_item()`)
	let obj_id = C.obj_id(obj,state)

	let base = { main: [`// assert ${obj_id}`], bindings: [] }

	// сделано чтобы можно было по F-RETVAL-LAST цепляться
	base.main.push( `let ${obj_id} = CL2.create_item()`)	
	base.main.push( `CL2.attach( ${obj_id},'output',CL2.create_cell() )`)
	state.generated_ids.push( obj_id )

	//  и фичеры.. это у нас дети которые не дети	
	let modified = C.modify_parent( state )
	if (C.get_nested(obj))
	{
		//let mod_state = C.modify_parent(state,obj.$name)
		for (let f of C.get_nested(obj)) {
			let o = C.one_obj2js_sp( f, modified )
			base.main.push( o.main )			
			base.bindings.push( o.bindings )
		}
	}

	//let locinf = obj.locinfo.short
	message ||= obj.locinfo.short

  let clear_timeout = ''
	if (timeout > 0) {
		base.main.push(`let ${obj_id}_timeout = setTimeout( () => {
	    console.error( 'assert TIMEOUT',\`${message || ''}\` )
	    throw \`${message || ''}\`
		}, ${timeout})`)
		clear_timeout = `clearTimeout( ${obj_id}_timeout )`
	}	
	
	base.main.push(`${cond.from}.subscribe( cond => {
	  if (!cond) {
	    console.error( 'assert FAILED',\`${message || ''}\` )
	    throw \`${message || ''}\`
	  }
	  console.log("assert OK",\`${message || ''}\` )
	  ${obj_id}.output.submit(true)
	  ${clear_timeout}
	})	
	`)
	
	return base
}

export function locinfo( obj, state )
{
	return { main: obj.locinfo.toString(), bindings: [] }
}

