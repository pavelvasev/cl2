// F-TASKS

import * as C from "../../lib/cl2-compiler.js"
import * as FORMS from "../forms/forms.js"

let default_cp = (assigned_names) => { return {normal: assigned_names, renamed: {}, pos_rest: [],named_rest:[]} }

export function init( state, tool )
{
	
//	state.env.cofunc = { make_code: cofunc, check_params: default_cp}
	state.env.func = { make_code: func, check_params: default_cp}
	state.env.return = { make_code: _return, check_params: default_cp}
	state.env.exit = { make_code: _exit, check_params: default_cp} // F-FUNC-EXIT
	state.env.wait = { make_code: wait, check_params: default_cp} // F-FUNC-EXIT

	// todo вообще этот output можно ловить и передавать старшему процессу. для F-RUN
	/* по факту это приводит к путанице. вызываю exit думая что из реакции выхожу, а по факту иду вот в этот скопе.
	*/
	// todo убрать ето
	tool.add_global_code( ['let return_scope = self; let exit_scope = self;',
		`CL2.attach( self, 'output', CL2.create_cell() )`		
	])

	let name = "NAME_CREATED_FUNC"
	/*
	let code = `
	 obj "${name}" {
	 	  in {
	 	  	rest*: channel // было cell но тогда медленно отрабатывают включения. а мы хотим F-REST-REACT-ASAP
	 	  }
	 	  output: cell
	 	  
  	  r: react @rest {: args |
  	    console.channel_verbose("co-func called '${name}'. self=",self+'')
  	    let rr = ${name}( ...args )
  	    console.channel_verbose("co-func finished '${name}'. self=",self+'','result=',console.fmt_verbose(rr))
  	    return rr
  	  :}
  	  //react @output {: self.destroy() :}

  	  bind @r.output @output
	 }
	`
	//console.log("autogen",code)
	let c_obj = C.code2obj( code )
	let strs = [C.objs2js( c_obj,state )]	
  */
	tool.add_global_code( [`// generate_func_caller_js` ])
	

/* оставлено на память как пример добавки cl-кода из js
	let task_code = `
obj "task" {
  in {
    input: channel
    action: cell
  }

  output: cell

  b: react @input @action

  bind @b.output @output

  b2: react @b.output {: b.destroy(); b2.destroy(); :}
  // мы не вызываем self.destroy т.к. у нас output, на него подписаны..

  //react @input {: console.log('cofunc started',self + "") :}
  //react @b.output {: console.log('cofunc finished',self + "") :}
  
  // todo
  }`
	let task_code_lang = tool.compile_string( task_code, state )
	tool.add_global_code( "// from compute plugin",task_code_lang )
*/

}

// создает объект, возвращающий в .output код функции
/*
function generate_func_object( self_objid, func_code ) {
	return { main: [`let ${self_objid} =  CL2.create_item(); ${self_objid}.$title="${self_objid}"`,
				`let ${self_objid}_output = CL2.create_cell(`,func_code,")",
				 `CL2.attach( ${self_objid}, 'output',${self_objid}_output )`],
			     bindings:[] }
}
*/

// создает объект name, который вызывает указанную функцию при смене параметров
// идея - чтобы можно было говорить func "x" а потом писать (x 1 2 3)
// по сути тело то это apply, не знаю зачем я это дублирую?
// todo тут надо параметры перечислить функции.. тогда появится проверка типов уровня obj - красота
function generate_func_caller(name, state) {
	// todo это просто apply, надо только *rest передать и все.
	// хотя не совсем.. еще сигнатуру соблюсти надо.
	// но тогда это и не rest
	let code = `
	 obj "${name}" {
	 	  in {
	 	  	rest*: channel // было cell но тогда медленно отрабатывают включения. а мы хотим F-REST-REACT-ASAP
	 	  }
	 	  output: cell
	 	  
  	  r: react @rest {: args |
  	    console.channel_verbose("co-func called '${name}'. self=",self+'')
  	    let rr = ${name}( ...args )
  	    console.channel_verbose("co-func finished '${name}'. self=",self+'','result=',console.fmt_verbose(rr))
  	    return rr
  	  :}
  	  //react @output {: self.destroy() :}

  	  bind @r.output @output
	 }
	`
//console.log("autogen",code)
	let c_obj = C.code2obj( code )
	let strs = [C.objs2js( c_obj,state )]
	// произошла регистрация. прекрасно!

  // сокращаем коды с 200кб до 100! потому что убираем дублирование.
  // пока решил не делать - разные сигнатуры же у функций.. надо смотреть как это будет себя повести
  //
	// strs = `let create_${name} = generate_func_caller_js( ${name} )`

	return {main:strs,bindings:[]}	
}

/*
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	// r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	// todo - надо отменить сборку внешних аргументов.. не к чему.. rest F-REST-AUTO-EXTRACT
  	    	// это 
  	    	//vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! ${name}. self=',self+'',' args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }
*/


let ccc = 0
// действие типа "функция"
// func {: :} - на выходе даёт объект где output функция
// func "name" {: :} - на выходе регает функцию + регает объект вызывающий эту функцию в режиме apply
// наличие анонимного режима позволяет ловить return не только в "верхних" функциях а и типа в лямбдах
export function func( obj, state )
{	

	let name 
	let fn_code

	let anonymous_mode = obj.name_is_autogenerated ? true : false

	if (obj.params[1]) { // вариант func "name" code
		name = obj.params[0]
		state.static_values[ name ] = true // надо сделать до cocode_to_code чтобы там уже могли тоже ссылаться
		fn_code = obj.params[1]
		anonymous_mode = false
	}
	else
	{  
		// вариант name: func {...} хотя я вроде такое не приветствую почему-то
		name = obj.$name_modified || obj.$name		
		fn_code = obj.params[0]
	}

	// надо вызвать до cocode_to_code, чтобы зарегистрировать в state объект вызова. 
	// тогда рекурсия в функции доступна.
	let caller = generate_func_caller( name, state )

	fn_code = cocode_to_code( fn_code,state,true,true )

	if (anonymous_mode) {
		console.log("func: anonymous_mode is prohibited")
		let self_objid = C.obj_id( obj, state )
		let code = [`function (${fn_code.pos_args.join(',')}) { ${fn_code.code} }`]
		return generate_func_object( self_objid, code)
	}
	
	//console.log('fn name=',name,'dir=',state.dir,"state.is_seq_wait=",state.is_seq_wait)

	//let export_flag = state.struc_parent_id == null && (state.dir == '' || state.dir == './') ? 'export ' : '' // todo перенести это в bundle-2
	let export_flag = state.space.get_export_flag( state )
	
	let strs = [`${export_flag}function ${name}(${fn_code.pos_args.join(',')}) { `,fn_code.code, `}`]
  strs.push( `CL2.attach( self,"${name}",${name} )` )

  state.space.register_export( name,state )

	// .static_values это тема, чтобы на функцию не биндиться а как есть передавать

  // todo это надо как-то соптимизировать. по сути нам надо сгенерировать объект
  // что-то типа define_obj_from_func "${name}" ${name}
  //console.log("GGG",name)
  
	strs.push( caller.main )
	return {main:strs,bindings:[]}
}

/* cocode это код {} и его преобразуем в платформенный.
   есть отличия между обычным кодом и кодом, который будет генерировать children:
   - передается первый дополнительный аргумент, arg_obj
   - сообразно tree-parent у объектов идет на этот arg_obj
   - output у func наоборот, не нужен. равно как и func_self тоже.
   отличать эти два случая мы будем по особой метке в значении аргумента.
   попытаемся сделать это как для статики elem { ..} так и для динамики elem childr=@some

   но с другой стороны, так то прикольно было бы чтобы эта функция продолжала возвращать какие-то
   значения в output.. ну или просто какие-то значения
*/
export function cocode_to_code( v,state, is_return_scope, is_exit_scope ) {
	if (!state) {
		console.trace()
		 throw "cocode_to_code no state!"
		}
	if (!v.cofunc) return v

/* F-TREE
	if (v.children_mode) { // F-CHILDREN-PARAM
		let modified = C.modify_parent( state, "arg_obj" )	
		v.pos_args.map(x => modified.static_values[x] = true )
		let s = C.objs2js( v.code,modified )
		// F-CHILDFUNC-OBJS-RETURN для интереса сделано что чилдрен-функция возвращает список созданных объектов
		let strs = [`// children from ${v.locinfo?.short}`, s, `return [${modified.generated_ids.join(',')}]` ]
	  let txt = C.strarr2str( strs )
   	return { code: txt, pos_args: ["arg_obj",...v.pos_args] }
	}
*/	

	// поменяем особые формы
	// func_self а не self потому, чтобы можно было через self все еще ссылаться на родительский объект
	// если функция определена внутри объекта

	// вот тут надо не null а arg_obj
	// F-TREE
	let modified = C.modify_parent( state, "func_self" )

/* F-TREE вроде как не надо стало.. у нас таки там процесс образовался.. ну пока так..
	modified.next_obj_cb2 = ( obj, objid, strs, bindings, bindings_hash_before_rest, basis_record ) => {
		strs.push(`${objid}.task_mode = true`)
		return
	}
*/	
	
	// ссылки на параметры идут по значению а не по ссылкам типа binding
	v.pos_args.map(x => modified.static_values[x] = true )

	//console.log("iii",v.code)
	let s = C.objs2js( v.code,modified )

	// F-RETVAL-LAST
	//let last_obj_id = C.obj_id( v.code[ v.code.length-1 ], state )
	// не прокатило. потому что у нас else поедается if-ом и т.п.
	let last_obj_id = modified.generated_ids[ modified.generated_ids.length-1 ]
	let connect_last = modified.generated_ids.length == 1 && last_obj_id ? `if (${last_obj_id}.output) CL2.create_binding( ${last_obj_id}.output, func_self.output ) // F-RETVAL-LAST` : ``

	if (modified.disable_retval_last) connect_last = ''

	//s = C.strarr2str( s )

  // let args = v.pos_args.map(x => "__" + x).join(",")
 	// поскольку мы выдаем функцию.. то на вход идут конкретные значения
 	// но в коде мы считаем их коммуникац. примитивами. и поэтому мы их оборачиваем в примитивы, эти значения.
	//let args_cells = v.pos_args.map(x => `let ${x} = CL2.create_cell( __${x} )`)	

	// F-FUNC-EXIT
	// F-TREE - все функции несут неявный процесс и его же и возвращают

/*
	let output_things = [		
		`let func_self = { $title: 'cofunc_action' }`, 
		is_return_scope ? `let return_scope = func_self` : '',
		is_exit_scope ? `let exit_scope = func_self` : '',
		"let output = CL2.create_cell();",
		"CL2.attach( func_self,'output',output )"]
*/		

  // func_process записан в default.cl. надо бы сюда перенести.		
	let output_things = [		
		`let func_self = create_func_process({})`, 
		is_return_scope ? `let return_scope = func_self` : '',
		is_exit_scope ? `let exit_scope = func_self` : '',
	]		
	let strs = [`// cofunc from ${v.locinfo?.short}`, output_things, s, connect_last, "return func_self"]

	// некрасиво получается. подумать чтобы код мог быть массивом, тогда будут отступы.
	let txt = C.strarr2str( strs )

	return { code: txt, pos_args: v.pos_args.map(x => x) }
}

/*
  F-RETURN-SCOPE
  этот алгоритм работы return опирается на return_scope объявленную выше
  которая появляется только у функций. а у блоков она не появляется.  
  т.е. опираемся на лексический scope платформенного языка.

  а иначе надо передавать в return контекст.. как параметр.. и по нему уже
  искать функцию..
*/
export function _return( obj, state ) 
{
	//console.log("_return",obj)
	
  let initial_value = 'CL2.NOVALUE'
  let p0 = obj.params[0]
  let base = { main: [ `// return at ${obj.locinfo?.short}`], bindings: [] }

  if (C.get_nested(obj)) {
		//let mod_state = C.modify_parent(state,obj.$name)
		let mod_state = state
		let objs = C.objs2objs( C.get_nested(obj),state )
		for (let f of objs) {
			let o = C.one_obj2js_sp( f, mod_state )
			base.main.push( o.main )
			//bindings.push("// bindings from feature-list")
			base.bindings.push( o.bindings )
		}
	}

  if (p0 != null) {
  	if (typeof(p0) == 'object' && p0.link) {
  		initial_value = p0.from
  		if (state.static_values[p0.from])
  			// вроде бы так можно потому что там функция поймет что это канал..
  			base.main.push( `return_scope.output.submit( ${p0.from} )` )
  		else
  			base.main.push( `${p0.from}.once( val => return_scope.output.submit( val ) )` )
  		// тут можно поставить subscribe
  		// но тогда надо следить за удалением return-объекта т.к. в данном случае он 
  		// является процессом..
  		// ну или надо к кому мы там приаттачимся - на release цепляться..
  	}
  	else {  		
  	  initial_value = C.objToString(p0,1,state,obj)  	
  	  base.main.push( `return_scope.output.submit( ${initial_value} )` )
  	}
  }
  // отобьем желание генерировать возврат на текущем уровне.. ну это хак. F-RETVAL-LAST
  // state.generated_ids.push( ";-)","***")
  // вроде как бы и не нужно стало т.к. F-RETVAL-LAST работает только на 1 окружении
  // ну а если он совпадает с return то и ладно.

  // для F-RETVAL-LAST все-таки что-то надо показать, а то оно return просто не видит..
  // и считает что там например 1 оператор и на него сажается
  // но в то же время просто ерунду мы записать в id не можем т.к. F-SEQ-WAIT читает эти id
  //let objid = C.obj_id( obj, state )
  //base.main.push( `let ${objid} = {} // return operator`)
  //state.generated_ids.push( objid )
  // короче заморочки.. проще вот так сделать
  state.disable_retval_last = true
	
	return base

	//let value_str = `initial_values.hasOwnProperty('${name}') ? initial_values.${name} : ${initial_value}`

}

// выход из функции F-FUNC-EXIT
export function _exit( obj, state ) 
{
	//console.log("_return",obj)
	
  let initial_value = 'CL2.NOVALUE'
  let p0 = obj.params[0]
  let base = { main: [ `// exit at ${obj.locinfo?.short}`], bindings: [] }

  if (C.get_nested(obj)) {
		//let mod_state = C.modify_parent(state,obj.$name)
		let mod_state = state
		for (let f of C.get_nested(obj)) {
			let o = C.one_obj2js_sp( f, mod_state )
			base.main.push( o.main )
			//bindings.push("// bindings from feature-list")
			base.bindings.push( o.bindings )
		}
	}

  if (p0 != null) {
  	if (typeof(p0) == 'object' && p0.link) {
  		initial_value = p0.from
  		if (state.static_values[p0.from])
  			base.main.push( `exit_scope.output.submit( ${p0.from} )` )
  		else
  			base.main.push( `${p0.from}.once( val => exit_scope.output.submit( val ) )` )
  	}
  	else {
  	  initial_value = C.objToString(p0,1,state,obj)  	
  	  base.main.push( `exit_scope.output.submit( ${initial_value} )` )
  	}
  }
  // отобьем желание генерировать возврат на текущем уровне.. ну это хак. F-RETVAL-LAST
  // state.generated_ids.push( ";-)","***")
  state.disable_retval_last = true
	
	return base

	//let value_str = `initial_values.hasOwnProperty('${name}') ? initial_values.${name} : ${initial_value}`

}

/*
// ну посмотреть на его поведение.. сейчас странная цепочка
// мб вернуться к parent-у и реакцию на parent
// попытка опоры на динамический контекст

obj "return" {
  in {
    value: cell
  }

  //return_scope := find_return_scope

  // ну тут история что value сразу срабатывает. а может быть имеет смысл delayed сделать..
  // тогда парент-а проверять не придется т.к. он как правило есть
  // но вообще хорошо бы парента просто в обязательные параметры
  react @value {: value |
    // надо добраться до некотого блока возвращающего значения.. и передать его туда
    //let p = self.attached_to
    // спорная реализация.. я тут не проверяю parent на изменение
    // но впрочем как и всю цепочку.. будем посмотреть
    let rs = find_return_scope( self )
    console.log("return: find_return_scope result=",rs,'self=',self+'')
    //let rs = return_scope.get()
    if (!rs?.output) {
      console.error("return: failed to find return scope!",self+"",rs)
      return "return_not_found_output"
    }
    console.log("sending value",value)
    rs.output.submit( value )
  :}
}

/////////////////////////// старый рабочий ретурн

// ну посмотреть на его поведение.. сейчас странная цепочка
// мб вернуться к parent-у и реакцию на parent
obj "return" {
  in {
    value: cell
  }

    // ну тут история что value сразу срабатывает. а может быть имеет смысл delayed сделать..
    // тогда парент-а проверять не придется т.к. он как правило есть
    // но вообще хорошо бы парента просто в обязательные параметры
    react @value {: value |
      // надо добраться до некотого блока возвращающего значения.. и передать его туда
      //let p = self.attached_to
      // спорная реализация.. я тут не проверяю parent на изменение
      // но впрочем как и всю цепочку.. будем посмотреть
      let p = self.parent && self.parent.is_set ? self.parent.get() : self.attached_to
      //console.log('============ return acting',self+"",self)
      //console.log("============ return reacting", p+"")
//      console.trace()
      while (p) {
        //console.log("=========== return checking p=",p+"")
        if (p.output) {
          //console.log("================== return found output", value,p.output + "")
          p.output.set( value )
          return "return_found_output"
        }
        //console.log("it has no ouytput",JSON.stringify(p))
        p = p.parent ? p.parent.get() : p.attached_to
      }
      console.error("return: failed to find output cell!",self+"")
      return "return_not_found_output"
    :}
}

/////////////////////////// очень старый ретурн
obj "return" {
  in {
    value: cell
  }

  if @self.parent { 
    print "OK RETURN HAVE PARENT"

    // ну тут история что value сразу срабатывает. а может быть имеет смысл delayed сделать..
    // тогда парент-а проверять не придется т.к. он как правило есть
    // но вообще хорошо бы парента просто в обязательные параметры
    react @value {: value |
      // надо добраться до некотого блока возвращающего значения.. и передать его туда
      let p = self.parent.get()
      //console.log("============ return reacting", p+"")
      //console.trace()
      while (p) {
        //console.log("=========== return checking p=",p+"")
        if (p.output) {
          //console.log("================== return found output")
          p.output.set( value )
          return {return_found_output:true}
        }
        p = p.parent.get()
      }
      return {return_found_output:false}
    :}

  } else {
    print "OK RETURN HAVE NO PARENT"
    react @value {: value |
      console.log("============ return reacting, no-parent mode")
    :}
  }
}
*/


// F-SEQ-WAIT
import * as COMPUTE from "../compute/compute.js"
export function wait( obj, state )
{
	let base = { main: [], bindings: [] }

	// так надо а то они думаю что там родитель есть.. хотя он вроде как и не нужен тут..
	// todo тут надо просто правильно выставить tree_parent_id / struc_parent_id
	let objid = C.obj_id(obj,state)
	base.main.push( `let ${objid} = CL2.create_item() // wait`)
	base.main.push( `CL2.attach( ${objid},'input',CL2.create_cell())`)
	base.main.push( `CL2.attach( ${objid},'output',CL2.create_cell())`)

	//  и фичеры.. это у нас дети которые не дети	
	let counter = 0
	let prev_objid = objid
	let prev_from = null // `${objid}.input`
	//let ch = C.get_children(obj,0)
	//let ch = Object.values(obj.children) // hack
	let ch = obj.params[0]

	let mod_state = C.modify_parent(state,objid)
	//mod_state.is_seq_wait = true
	// работа в mod_state с измененным struc_parent_id - уберет export-ы. что нам и надо. (после ==== экспорт это странно)
	let code = COMPUTE.cocode_to_code( ch,mod_state,false,false )
	//console.log(code)
	//state.auto_return_disabled = true

	// и теперь мы настраиваем реакцию..
	// ну кого ждем и как? ну например всех и по output. хотя надо бы по шедулед-заданиям так-то
	let ids = "[" + state.generated_ids.join(",") + "]"
	base.main.push( 
		`let ${objid}_waiting_items = ${ids}.filter( x => x.output ? true : false).map( x => x.output )`,
		`let ${objid}_done = CL2.when_all_once( ${objid}_waiting_items )`,
		`let ${objid}_unsub = ${objid}_done.once( (vvv) => { if (return_scope.output.is_set) return; `,code.code,` })`,
		`return_scope.output.once( ${objid}_unsub )` // мол нечего ждать если return сказали
	)

	state.generated_ids.push( objid )

	return base
}	