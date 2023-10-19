// Программа сгенерирована clon-lang -- https://github.com/pavelvasev/clon-lang
let self={};
  // clon cl2-browser.js runtime
  // Модуль совместимости с браузерами.

// setImmediate нету в браузере, поэтому делаем свой https://learn.javascript.ru/setimmediate
// https://groups.google.com/a/chromium.org/g/blink-dev/c/Hn3GxRLXmR0/m/XP9xcY_gBPQJ
// ну или можно просто setTimeout
// либо вообще зарефакторить и уйти от immediate на подумать - это же для логического времени.

// F-JOIN-NODEJS-BROWSER-RUNTIME - решено пока и для ноды и для веба одинаковые файлы иметь
// чтобы мозги себе не парить. Поэтому важно здесь делать код такой который бы и нода
// переварила.

if (typeof window === "object") {
  if (!window.setImmediate) window.setImmediate = function(func) {
    new Promise(function(resolve){
        resolve();
    }).then(func);
  };
}

  // clon cl2.js runtime
  /* CLON-рантайм для платформы Javascript
 - библиотека примитивов синхронизации (Comm, Cell, Channel,и т.п).
 - и операций над ними (when_all, when_any и т.д.)
 - доп. утилиты (monitor_rest_values и т.п.)
 - планировщик отложенных заданий (schedule)  
*/ 

// специальное значение чтобы явно отмечать значение "нет данных"
export var NOVALUE = {novalue: true}

// todo переделать bind. надо bind на target-object. и это зависит как бы от нас
// а нас подписать - это просто нам send послать.
// и тогда не надо будет делать проверку типов (кто нам посылает? надо знать на что у него подписаться).
// это позволит в частнои реализовать Н-модель (Нариньяни А.С.). Раз на вход send - универсальный протокол.
// хотя можно и по-другному как сейчас, но это не удобно.
// окей а что выдает пропагатор? ответ? интервал? если интервал - как он идет в ячейку?

var global_thing_counter = 0

/* в браузере стек не видно
let orig_cons = console.log
console.log = (...args) => {
	orig_cons(performance.now(),...args)
}
*/

console.channel_verbose = (...args) => {}
let fmtval = () => {}

// process мб не определён
if (typeof(process) !== "undefined" && process.env.VERBOSE) {
	console.channel_verbose = (...args) => {
		console.log("\t",...args)
		//return true
	}
	fmtval = ( value ) => {
	  let s = (value + "")
	  if (s.length > 0) {
	  	if (s.length > 50) return "<<<" + s.substring(0,50) + "...>>>"
	  	return s
	  }
	  return value
	}
}


// базовый класс примитивов синхронизации.
export class Comm {
	constructor() {
		this.$cl_id = (global_thing_counter++)		
	}
	toString() {
		return `${this.constructor.name}:${get_title( this )}[id:${this.$cl_id},pr:${this.get_m_priority()}]`
	}
	// становится потребна
	// subscribe на однократное срабатывание.
	once( fn ) {
		let unsub
		let need_unsub
		unsub = this.subscribe( (val) => {
			if (unsub) 
				  unsub() 
			  else need_unsub = true
			fn(val)
		})
		if (need_unsub) { unsub(); return () => {} }
		return unsub
	}

	// F-COHERENT-MIND
	get_m_priority() {
		if (this.attached_to?.get_m_priority)
			return this.attached_to.get_m_priority()
		return 0
	}	
	// так то тут понижение может стоит всем подчиненным передать..
	// и не только на момент связи
	set_m_priority(v) {
		if (this.attached_to?.set_m_priority)
			return this.attached_to.set_m_priority(v)
	}
	m_priority_object() {
		if (this.attached_to?.m_priority_object)
			return this.attached_to.m_priority_object()
	}
}

export class Channel extends Comm {
	constructor() {
		super()
	}
	submit( value ) {
		this.emit( value )
	}
	// провести сигнал
	emit( value ) {
		//console.channel_verbose( "Port submit:",this+"","value=",value instanceof Comm ? value + "" : value,typeof(value) )

		console.channel_verbose( "Port submit:",this+"","value=",fmtval(value) )
		//console.log(this.subscribers)
		this.subscribers.forEach( fn => fn(value) )
		//this.is_cell = true
	}
	destroy() {
		//console.log("comm destroy",this+"")
		this.subscribers.clear()
		// todo хранить ссылку на источник и удалять себя из источника..
	}
	subscribers = new Set()
	// подписаться к этому каналу. cb - код
	on( cb ) {
		this.subscribers.add( cb )
		let unsub = () => {
			this.subscribers.delete( cb )
		}
		return unsub
	}
	subscribe( cb ) { // синоним
		return this.on( cb )
	}
	// подписать этот канал на другой канал
	// если были подписки на другие каналы они сохраняются.
	// мб connect_source?
	connect_to( source_channel ) {
		let unsub = source_channel.on( (val) => {
			console.channel_verbose("src",source_channel + "","==>",this+"")
			this.emit(val)
			} )
		return unsub
	}

	// связывание с другими примитивами синхронизации
	bind( source_object ) {
		if (source_object instanceof Channel)
			return this.connect_to( source_object )

		// дают ячейку?
		// ну будем слушать для интереса assigned. а если мало - уточняйте что слушать
		// надо ли установить начальное значение?
		// кстати вообще идея.. если есть set и есть get то сделать всегда set( get() )
		// и может быть - метода get это его значение.. хотя это дорого
		if (source_object instanceof Cell) {
			// проба интересного
			/*
			console.channel_verbose("Channel: schedule copy data from cell (if set)",source_object+"","-->",this+"")
			schedule( () => {
			if (source_object.is_set) {
				console.channel_verbose("Channel: performing scheduled copy data from cell (if set)",source_object+"","-->",this+"")
				//console.log("source cell is set, passing to channel. this=",this+"","src=",source_object+"","value=",source_object.get())
				//console.trace()
				this.emit( source_object.get() )
			}})
			*/
			return this.connect_to( source_object.assigned ) 
		}
		// нам дают на вход реакцию - значит мы слушаем её результаты
		if (source_object instanceof Reaction )
			return this.connect_to( source_object.output )

		//console.log("source_object instanceof ClObject:",source_object instanceof ClObject)
		if (source_object instanceof ClObject) {
			if (source_object.output)
				return this.bind( source_object.output )
			throw new Error(`Channel: do not know how to bind source_object=${source_object}. It has no .output field!`)
		}

		throw new Error(`Channel: do not know how to bind source_object=${source_object}`)
	}
}

export function create_channel() {
	let channel = new Channel()
	return channel
}

// сейчас не используется, см default.cl reaction
export class Reaction extends Comm { // Code?
	constructor( fn ) {
		super()
		// ну вот можно будет так сделать
		//attach( this, "func", create_channel())
		attach( this, "input", create_channel())
		attach( this, "action", create_cell())
		attach( this, "output", create_channel())
		//this.call = create_channel()
		//this.result = create_channel()
		this.input.on( (arg) => {
			let result = this.eval(arg)
			// todo 1 ожидать результатов в процессном режиме, 2 мб посылать промисы а не сами результаты..
			this.output.emit( result ) 
		})

		//this.func.on( (code) => this.set(code))

		if (fn) this.action.set(fn)
	}

	eval( ...args ) {
		let fn = this.action.get()
		return fn.apply( this, args )
	}

	// связывание с другими примитивами синхронизации
	bind( source_object ) {
		// дают на вход канал - значит мы слушаем канал и вызываем метод
		//console.log("method connected to input from",source_object)
		if (source_object instanceof Channel)
			return this.input.connect_to( source_object )
		if (source_object instanceof Cell) {
			let res = this.input.connect_to( source_object.changed )
			if (source_object.is_set) {
				this.input.emit( source_object.get() )
			}
			return res
		}

		if (source_object instanceof ClObject || source_object instanceof Comm) {
			if (source_object.output)
				return this.bind( source_object.output )
			throw new Error(`Reaction: do not know how to bind source_object=${source_object}. It has no .output field!`)
		}

		throw new Error(`Reaction: do not know how to bind source_object=${source_object}`)
	}


}

export function create_reaction(x) {
	let k = new Reaction(x)
	return k
}


export class Cell extends Comm {
	value = null
	// большой вопрос. мы не можем получается задать значение null по умолчанию
	constructor( initial_value=NOVALUE ) {
		// оказывается если послать сюда undefined то оно бодро превращается в NOVALUE..
		//console.log('cell constructor',initial_value)
		super()
		attach( this,"changed_emit",create_channel())
		// idea: this.changed_emit = attach( create_channel(),this )
		
		attach( this,"changed",create_channel())
		//this.changed = create_channel(`${title}.changed`)
		// создает процесс передачи на следующий такт с поеданием дублей
		this.changed_emit_binding = create_binding_delayed( this.changed_emit, this.changed )
		attach( this,"assign",create_channel())
		attach( this,"assigned",create_channel())
		//this.assign = create_channel(`${title}.assign`)
		//this.assigned = create_channel(`${title}.assigned`)
		this.assign.on( (value) => this.set(value))
		// this.set( initial_value )
		// надо еще создавать ячейки без значений.
		// например для вычислений. пока не вычислено же нет результата
		// ну и промисы например - они тоже таковы.
		// но пока это завязано на синтаксис..

		this.value = initial_value
		if (initial_value !== NOVALUE) {			
			this.is_set = true
		}
		// вроде как нет смысла вызывать set - в ячейке все-равно еще никто не прицепился
		//this.assigned.emit( initial_value )

		// была идея сделать раздельно assign это для приема, и assigned для уведомлений
	}
	destroy() {
		// отпишем все каналы
		this.changed_emit.destroy()
		this.changed.destroy()
		this.assigned.destroy()
		this.assign.destroy()
	}
	/* вопрос.. метод set как соотносится с каналом assigned?
	   т.е запись в канал вызывает set
	   или вызов set вызывает уведомление канала, что что-то было?

	   update можно сделать assign и то будет запись в assigned
	*/

	submit( value ) {
		//console.log("called submit of this",this)
		this.set( value )
	}
	subscribe( fn ) {
	  if (this.is_set && !this.changed_emit_binding.scheduled) 
	  	 fn( this.get() )
	  return this.changed.subscribe( fn )
	}

	set( new_value ) {
		console.channel_verbose( "Cell set:",this+"","value=",fmtval(new_value) )
		//console.trace()
		this.is_set = (new_value !== NOVALUE)
		if (new_value != this.value) {
			let old_value = this.value
			this.value = new_value
			//console.log("changed-emit:",new_value)
			//console.trace()
			this.changed_emit.emit( new_value, old_value )
			// вот тут вопрос - а что если ну общее значение emit это кортеж
			// но он же всегда пусть и передается во все on да и все?
		}
		// уже прописано this.value - геттер сработает
		this.assigned.emit( new_value )
	}
	get() {
		return this.value
	}
	// связывание с другими примитивами синхронизации
	bind( source_object ) {
		// дают на вход канал - значит мы слушаем канал и вызываем метод
		//console.log("cell connecting to input from",source_object,"source_object instanceof Method=",source_object instanceof Method)
		if (source_object instanceof Channel)
			return this.assign.connect_to( source_object )
		if (source_object instanceof Cell) {
			let res = this.assign.connect_to( source_object.changed )
			// todo xxx продолжить здесь. идея - проверять что присвоено.
			// ну а если не присвоено ничего не делать. и аналогично в monitor_rest_any проверять..
			// проверять важно. потому что иначе мы нулл начинаем гонять
			if (source_object.is_set)
				this.set( source_object.get() ) // а если там ничего нет?
			else this.is_set = false
			// вообще идея - прогонять этот set с non-set по всей глубине, вышибывая значения
			// и отдельно функции - is_changed проверялка ( а не != ) т.е. пользователь может задать
			// и is_nonset - проверялка что значение несетовое.. хотя его можно в отдельную константу просто..
			// а так пока получается что мы вводим состояние для ячейки - установлена она или нет
			// и дополнительно правила распространения этого состояния
			// ну пока они распространяются на 1 шаг..
			return res
		}
		if (source_object instanceof Reaction) {
			return this.assign.connect_to( source_object.output )
			// надо ли его вызывать?
			//this.set( source_object.get() ) // а если там ничего нет?
		}
		//console.log("source_object instanceof ClObject:",source_object instanceof ClObject)
		// очень большой вопрос. а хорошо ли это. потому что получается, что тепреь в ячейку
		// сам объект то и не положить. вероятно это очень даже не фонтан.
		// очередная удобняшка.
		if (source_object instanceof ClObject) {
			if (source_object.output)
				return this.bind( source_object.output )
			throw new Error(`Channel: do not know how to bind source_object=${source_object}. It has no .output field!`)
		}

		//if (source_object instanceof Function) {
		//	}
		throw new Error(`Cell: do not know how to bind source_object=${source_object} type=${typeof(source_object)}`)
	}
	
}

export function create_cell(value) {
	let k = new Cell(value)
	return k
}

export class ClObject extends Comm {
	constructor() {
		super()
		attach( this,"release",create_channel())
		//this.release = create_channel(`${title}.release`)

		this.release.subscribe( () => {
			//console.log('t2',this+"")
			// удалим объекты прикрепленные к этому...
			if (this.subobjects) {
				this.subobjects.forEach( obj => {
					if (obj !== this.release && obj.destroy) 
					    obj.destroy()
				})
			}			
		})
	}
	destroy() {
		//console.log('destory called',this+"", "emitting release",this.release+"")
		this.release.submit()
		this.release.destroy() // надо его отдельно, а то он подписки свои вычищает
	}

	// F-COHERENT-MIND
	m_priority = 0
	get_m_priority() {
		return this.m_priority
	}

	set_m_priority(reason_object) {
		// так бывает что каналы то одного объекта
		if (reason_object.m_priority_object() == this) return

		let v = Math.min( reason_object.get_m_priority(), this.m_priority )-1
		// а вот это не работает.
		//let v = Math.min( reason_object.get_m_priority()-1, this.m_priority )
		if (v < this.m_priority) { // положение может только улучшаться..
			this.m_priority = v
			console.channel_verbose("SCHED PRIORITY CHANGED of object",this+'',"to",v,'because of pressure from',reason_object+'','hosted at',reason_object.m_priority_object() + '' )
		} else 
			console.channel_verbose("SCHED PRIORITY NOT CHANGED of object",this+'',"to",v,'because of pressure from',reason_object+'','hosted at',reason_object.m_priority_object() + '' )
	}
	m_priority_object() { return this }
	
}

// embed_list массив вида имя, объект, имя, объект..
export function create_object( title, embed_list ) {
	let k = new Object(title)
	return k
}

export class Item extends ClObject {
	constructor(parent, children=[]) {		
		super()
		attach( this,"parent",create_cell(parent))
		//this.parent = create_cell(parent)
		this.parent.changed.subscribe( (val) => {
			// изменили parent
			if (val)
				val.append( this )
		})
		attach( this,"children",create_cell(new Set()))
		//this.children = create_cell(new Set(),`${title}.children`)
		attach( this,"appended",create_channel() ) // добавили ребенка
		attach( this,"removed",create_channel() ) // удалили ребенка
		//this.appended = create_channel()
		//this.removed = create_channel()

		for (let k of children)
			this.append( k )

		this.release.subscribe( () => {
			if (this.parent.is_set)			
				this.parent.get().remove( this )
		})
	}
	append( child ) {
		//console.log("append this=",this+"","child=",child+"")
		if (!(child instanceof Item)) return

		let cs = this.children.get()
	    if (cs.has( child )) return; // уже есть

		cs.add( child )
		if (child.parent.get() != this)
			child.parent.set( this )
		this.children.changed.emit( this.children.get() )
		this.appended.emit( child ) 
	}
	remove( child ) {
		if (!(child instanceof Item)) return

		let chldrn = this.children.get()
		//if (!chldrn.delete) console.error("chldrn is strange,",chldrn)
		chldrn.delete( child )

		child.parent.set( null )
		this.children.changed.emit( this.children.get() )
		this.removed.emit( child )
	}
}

export function create_item(parent,children=[]) {
	let k = new Item(parent,children)
	return k
}

// а вообще это надо если мы просто через a.b = ... работаем?
// но чилдрены опять же анонимны.. точнее они другое отношение..

// вопрос а надо ли удалять прицепленные объекты?

// вопрос а надо ли имя для подцепляемго объекта? ну пусть там будет анонимный
// список. биндинги так можно хранить. но это начинает напоминать children
// но чилдрен больше для визуальных объектов. ну стало быть можно ввести
// вторую иерархию. по аналогии как .host было. либо сделать как в QML
// что встраивается масса объектов, а некоторые из них еще и дети.
// update ну вообще надо бы поменять порядок: target, embedded_obj, name
// ну и сделать name необязательным мб
export function attach( target_object, name, embedded_object )
{
	if (target_object.hasOwnProperty(name))
		throw new Error(`target_object already has element name = '${name}'`)
	target_object[name] = embedded_object
	
	embedded_object.$title = name
	//embedded_object.title = 
	// todo: имя может тут кстати?
	// добавим еще в список подобъектов зачем-то
	// согласен, список подобъектов надо - чтобы спокойно удалять потом при удалении этого
	attach_anonymous( target_object, embedded_object )
}

export function get_title( obj ) {
	if (!obj.$title) {
		//console.error("get_title: title is not assigned to obj",obj)
		//console.trace()
	}
	if (obj.attached_to)
		return get_title( obj.attached_to ) + "." + (obj.$title || "unknown")
	if (obj.parent && obj.parent.is_set)
		return get_title( obj.parent.get() ) + "." + (obj.$title || "unknown")	
	return obj.$title || "unknown"
}

export function attach_anonymous( target_object, embedded_object )
{
	target_object.subobjects ||= []
	target_object.subobjects.push( embedded_object )
	embedded_object.attached_to = target_object	

	//embedded_object.m_priority = target_object.m_priority
}

// зачем нам объект связывания непонятно до конца
// но из компаланга-1 мы вынесли понимание что есть объекты, а есть связи между ними
// и это равноправные вещи. И поэтому binding вынесен в объект
export class Binding {
	constructor( src,tgt ) {
		//if (tgt instanceof Function)
		if (!src)
			console.error("binding src is null! tgt=", tgt + "")
		if (!src.subscribe)
			console.error("binding src have no subscribe method. src=", src + "","tgt=", tgt + "")

		this.unsub = src.subscribe( tgt.submit.bind(tgt) )

		tgt.set_m_priority( src )

		//this.unsub = tgt.bind( src )
	}
	destroy() {
		this.unsub()
		this.unsub = null
	}
}

export function create_binding( src, tgt ) {
	if (src === tgt) {
		console.trace()
		console.log(src+'')
		throw "binding src == tgt!"
	}
	console.channel_verbose("create_binding:",src+"","~~>",tgt+"")
	let k = new Binding( src,tgt )
	return k
}

// src - ячейка со списком примитивов синхронизации
// tgt - целевой примитив
// при изменении значения src или при срабатывании ячеек-каналов из src
// вызывается tgt
// итого any тут в смысле "любое из"
// update странно это выглядит. нет чтоб создать нечто что вернет канал который сработает определенным образом
// а проще даже не нечто а сам канал. но формально конечно это нечто.
export function create_binding_any( src, tgt ) {
	if (!(src instanceof Cell))
		throw new Error(`create_binding_any: not cell! ${src+''}`)

	let unsub = () => {}
	let dtgt = create_channel()
	dtgt.$title = "create_binding_any(dtgt)"
	dtgt.attached_to = src
	create_binding_delayed( dtgt, tgt )
	//console.log("create_binding_any src=",src)
	///tgt.on( () => console.log("see tgt event",tgt))
	function f() {
		unsub()
		let cells = src.get()
		unsub = create_binding_when_any( cells, dtgt )
	}
	
	//src.changed.on( () => console.log("src is changed!",src) )
	src.changed.on( f )
	let b2 = create_binding( src.changed, dtgt )
	return { destroy: () => { unsub.destroy(); b2.destroy() } }
}

// создает массив биндингов.. или групповой биндинг? ну к списку
// надо понять
// list - список примитивов
export function create_binding_when_any( list, q ) {
	//let q = create_channel()
	//SSconsole.log("create_binding_when_any, list=",list)
	let barr = []
	for (let k of list) {
		//console.log("connnecting ",k,"to",q)
		let b = create_binding( k, q )
		barr.push( b )
		//k.changed.on( () => console.log("k is changed ",k.get()) )
	}
	let unsub = () => {
		//console.log("unsub called")
		for (let b of barr) b.destroy()
	}
	return { destroy: unsub }
	//return unsub
}

// возвращает канал который срабатывает 1 раз, когда все примитивы из list сработали

export function when_all_once( list ) {
	let q = create_channel()
	//SSconsole.log("create_binding_when_any, list=",list)
	let values = new Array( list )
	let counter = list.length
	let index = 0
	for (let k of list) {
		let my_index = index
		let unsub
		let need_unsub
		if (!k.subscribe) {
			console.error("when-all: list element have no subscribe method. index=",index,"k=", k+"","list=",list)
		}
		k.once( (v) => {
			counter--
			values[ my_index ] = v
		    if (counter == 0)
		    	schedule( () => q.emit( values ), q )
		    // надо делать через шедуле.. а то там соединиться не успевают.. create_binding( when-all, ... )
		    	
		})

		index++
	}
	return q	
}

// возвращает канал который срабатывает, когда все примитивы из list сработали, и затем продолжает высылать
// обновления их значений. все упаковывается в delayed-режим, поэтому если на такте несколько канало сработали
// то это будет 1 сообщение. todo кол-во срабатываний можно сделать и параметром
export function when_all( list ) {
	let q = create_channel()
	let q2 = create_channel()
	let b = create_binding_delayed( q, q2 )
	//SSconsole.log("create_binding_when_any, list=",list)
	let values = new Array( list )
	let unsubs = []

	enter_mode_1()

	function enter_mode_1() {
		let counter = list.length
		let index = 0
		for (let k of list) {
			let my_index = index
			let unsub
			let need_unsub
			if (!k.subscribe) {
				console.error("when-all: list element have no subscribe method. index=",index,"k=", k+"","list=",list)
			}
			k.once( (v) => {
				counter--
				values[ my_index ] = v
			    if (counter == 0)
			    	enter_mode_2()		    	
			    // надо делать через шедуле.. а то там соединиться не успевают.. create_binding( when-all, ... )
			})

			index++
		}
	}

	function enter_mode_2() {
		q.emit( values )

		unsubs = list.map( (s,index) => s.subscribe( (val) => ff(val,index)))

		function ff( value, index) {
			values[index] = value
			q.emit( values )
		}
	}
	let orig = q2.destroy.bind(q2)

	q2.destroy = () => {
		unsubs.map( x => x())
		unsubs = []
		b.destroy()
		q.destroy()
		// todo k.once еще отписаться
		orig()
	}

	return q2	
}

// по списку примитивов синхронизации выдает список из ячеек, привязанных к этому списку
export function create_bound_cells( list ) {
	let barr = []
	let carr = []
	let index
	for (let k of list) {
		//console.log("connnecting ",k,"to",q)
		if (k instanceof Cell) {
			carr.push( k )
		}
		else {
			let c = create_cell()
			//if (k == null)
				//console.log("warning: k is null. list=",list.map( x=>x+''))
			let b = create_binding( k, c )
			barr.push( b )
			carr.push( c )
		}
	}
	let unsub = () => {
		//console.log("unsub called")
		for (let b of barr) b.destroy()
	}
	carr.destroy = unsub
	//return { destroy: unsub }
	return carr
}

/*
export class BindingAny {
	constructor( src_list,tgt ) {
		let barr = []
		for (let src of src_list)
			this.unsub = tgt.bind( src )
	}
	destroy() {
		this.unsub()
		this.unsub = null
	}	
}*/

///////////////////////////////////////
// F-DELAYED-EATER
// src, tgt - каналы
// неудобно конечно что это каналы..
// вообще подумать таки над emit который логический
export function create_binding_delayed( src, tgt ) {

	//return create_binding( src, tgt )

	tgt.set_m_priority( src )

	let res = { scheduled: false, destroy: () => unsub() }
	let unsub = src.on( (value) => {
		//console.log("delayed-binding on src=",src+"",". value",value+"","scheduling..")
		//if (value == null) console.trace()
		// console.log("delayed-binding emit",value,"to",tgt)
		// tgt.emit( value ) 
		// return

		if (!res.scheduled) {
			res.scheduled = true
			schedule( () => { 
				res.scheduled = false; 
				console.channel_verbose("delayed-binding real pass",src+""," ---> ",tgt+"")
				//console.channel_verbose("delayed-binding real pass",src+""," ---> ",tgt+"","value",res.value+"")
				tgt.emit( res.value )
			}, src)
		} //else console.log("delayed-binding shield! not scheduling")
		res.value = value
	})
	return res
}

// F-COHERENT-MIND
let next_tick = []
export function schedule( fn, priority_holder_object ) {

	if (!priority_holder_object) {
		console.trace()
		throw "schedule: no priority_holder_object"
	}

	let fn_priority = priority_holder_object ? priority_holder_object.get_m_priority() : 0
	fn.priority = fn_priority
	fn.priority_holder_object = priority_holder_object

	// попробуем вставкой мб так побыстрее таки.. 
	let i = 0
	while (i < next_tick.length && fn_priority < next_tick[i].priority) {
		i++
	}
	//console.log("next_tick before insert",next_tick.map( x => x.priority))
	next_tick = [...next_tick.slice(0,i), fn, ...next_tick.slice(i) ]
	//console.log("next_tick after insert",next_tick.map( x => x.priority))

/*
	if (next_tick.length > 0) {
		if (fn_priority > next_tick[0].priority) {
			console.channel_verbose("SCHEDULE f fn with priority (prefixed)", fn.priority,priority_holder_object+'' )
			next_tick.unshift( fn )
		}
		else {
			next_tick.push( fn )
			console.channel_verbose("SCHEDULE f fn with priority (suffixed)", fn.priority,priority_holder_object+'' )
		}
	}
	else {
		next_tick.push( fn )
		console.channel_verbose("SCHEDULE f fn with priority (suffixed 1)", fn.priority,priority_holder_object+'' )
	}
	// ну это прикол конечно. надо то ли списки завести, то ли что.
	next_tick = next_tick.sort( (a,b) => b.priority-a.priority)
*/	
	console.channel_verbose( "SCHEDULE item. Priorioty=",fn.priority,'holder=',fn.priority_holder_object+'') 
	console.channel_verbose( "NEXT-TICK priorities:",next_tick.map( x => x.priority)) 


	if (next_tick.length == 1)
		setImmediate( perform_scheduled )
}

function perform_scheduled() {
	//console.log( "perform_scheduled",next_tick)
	while (next_tick.length > 0) {
		let k = next_tick.shift()
		console.channel_verbose("EXEC SCHEDULED item of priority", k.priority, k.priority_holder_object+'' )
		k()
	}
}


/* старый простой алгоритм*/
/*
let next_tick = []
export function schedule( fn ) {
	next_tick.push( fn )
	if (next_tick.length == 1)
		setImmediate( perform_scheduled )
}

function perform_scheduled() {
	//console.log( "perform_scheduled",next_tick)
	let my = next_tick
	next_tick = []
	for (let k of my)
		k()
}
*/


/*
export class DelayedEater() {
	constructor( src, tgt ) {
		this.src = src
		this.tgt = tgt
	}
}
*/

// src - ячейка-источник, содержит массив ячеек
// tgt - целевой канал куда слать
// что делает. считывает src рассчитывая увидеть там массив ячеек
// и при изменении значений этих ячеек - собирает их в массив
// и кладет его в tgt
// проблема - если в src не ячейки а другие примитивы, то сборка ломается
export function monitor_rest_values( src,tgt ) {

	let unsub = () => {}

	let dtgt = create_channel()
	dtgt.$title = "create_binding_any(dtgt)"
	dtgt.attached_to = src
	let db = create_binding_delayed( dtgt, tgt )

		src.changed.subscribe( f )
		f()
		function f() {
			unsub()

			if (!src.is_set) {
				return
			}

			let comms = src.get()

			let rest_names // F-NAMED-REST
			if (comms && !Array.isArray(comms)) {
				// запомним что на вход шел словарь
				rest_names = Object.keys(comms)
				comms = Object.values( comms )
			}

			// это после преобразования F-NAMED-REST
			if (comms == null || comms.length == 0) {
				dtgt.emit( rest_names ? {} : [] )
				unsub = () => {}
				return
			}			


			if (comms.some( elem => elem == null)) {
				console.error("monitor_rest_values: incoming src list have nulls. src=",src+'',comms.map(x=>x+''))
			}

			let cells = create_bound_cells( comms )

			let all = create_channel()
			///attach_anonymous( this, "")
			all.attached_to = src; all.$title = "monitor_rest_values.all"
			
			//consoleА.log("all - subscribing")
			all.subscribe( () => {
				//console.log("all.subscribe ticked")
				let have_not_setted = false
				let values = cells.map( x => x.is_set ? x.get() : have_not_setted = x+"" )
				if (have_not_setted) {
					console.channel_verbose("monitor_rest_values: have non-setted values, exiting. src=",src+"","last non setted:",have_not_setted)
					return
				}
				//console.log("monitor_rest_values: collected",values,"from",src.get(),"emitting to",dtgt+"")
				console.channel_verbose("monitor_rest_values: collected values from",src+"","emitting to",tgt+"","values=",values,"cells was",src.get() + "")

				if (rest_names) { // F-NAMED-REST
					let result = {}
					// преобразуем обратно к словарю
					rest_names.map( (name,index) => result[name]=values[index])
					values = result
				}

				dtgt.emit( values )
			})

			let b = create_binding_when_any( cells, all )

			tgt.set_m_priority( all )

			//console.log("eeee this.release",this.release)
			unsub = () => {
				b.destroy()
				cells.destroy()
				unsub = () => {}
			}
	}

	return () => { unsub(); db.destroy() }
}

export function mark_block_function( fn ) {
	fn.is_block_function = true
	return fn
}

export function mark_task_function( fn ) {
	fn.is_task_function = true
	return fn
}

// необходимо перечислить все вышеперечисленное для доступа
// по идентификатору CL2 при встройке этого файла.
// вещи типа CL2=this и CL2=import.meta что-то не сработали.
let CL2={ create_binding, 
  create_cell, create_channel, create_item,
  NOVALUE, Cell, Channel, ClObject, Comm, attach,
  attach_anonymous, monitor_rest_values, when_all, when_all_once,
  create_binding_delayed, create_binding_any, schedule, get_title }

  let return_scope = self; let exit_scope = self;
  CL2.attach( self, 'output', CL2.create_cell() )

// from defaults.cl
  /// type react
  function create_react( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let input = CL2.create_channel()
            CL2.attach( self,"input",input )
            let action = CL2.create_cell(initial_values.hasOwnProperty('action') ? initial_values.action : CL2.NOVALUE)
            CL2.attach( self,"action",action )
        // end input params
        let output = CL2.create_channel()
        CL2.attach( self,"output",output )
        let init = 
        (obj) => { 
    //console.channel_verbose('------------- react: ',self+'','listening',input+'')
    let unsub = input.on( (value) => {
      let fn = action.get()      
      //console.log('react input changed. scheduling!',self+'','value=',value)
      CL2.schedule( () => { // принципиальный момент - чтобы реакция не срабатывала посреди другой реакции
        //console.log('react invoking scheduled action.',self+'')
        //console.log('react scheduled call !!!!!!!!!!!!',fn,self+'')
        let result
        //if (fn.is_block_function)
        //  result = fn( self, CL2.create_cell(value) )
        //else  

        result = fn( value )

        //console.log('react result=',result+'')

        // мега-идея промис js в том, что если результат это канал, то процесс продолжается..
        // т.е. нам как бы вернули информацию, что процесс еще идет и результаты уже у него

        if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            output.submit( val )
          })
        }
        else if (result instanceof Promise) {
          result.then( val => {
            output.submit(val)
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          output.submit( result )
        }
      }, obj)
    })

    self.release.on( () => unsub() )
   }
        init(self)
    return self
  }

  /// type extract
  function create_extract( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let input = CL2.create_cell(initial_values.hasOwnProperty('input') ? initial_values.input : CL2.NOVALUE)
            CL2.attach( self,"input",input )
        // end input params
        let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
        CL2.attach( self,"output",output )
        let o2 = CL2.create_channel()
        CL2.attach( self,"o2",o2 )
        let _bind_4 = CL2.create_binding(o2,output)
        CL2.attach( self,"_bind_4",_bind_4 )
        let init = 
        (obj) => { 
      let p = CL2.monitor_rest_values( input, o2 )
      obj.release.on( p )
     }
        init(self)
    return self
  }

  function print(...vals) {  console.log(...vals); return vals  }
  CL2.attach( self,"print",print )
        /// type print
        function create_print( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! print args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return print( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_84 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_84",_bind_84 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  /// type else
  function create_else( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let value = CL2.create_cell(initial_values.hasOwnProperty('value') ? initial_values.value : CL2.NOVALUE)
            CL2.attach( self,"value",value )
        // end input params
    return self
  }

  /// type if
  function create_if( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let condition = CL2.create_cell(initial_values.hasOwnProperty('condition') ? initial_values.condition : CL2.NOVALUE)
            CL2.attach( self,"condition",condition )
            let then_branch = CL2.create_cell(initial_values.hasOwnProperty('then_branch') ? initial_values.then_branch : CL2.NOVALUE)
            CL2.attach( self,"then_branch",then_branch )
            let else_branch = CL2.create_cell(initial_values.hasOwnProperty('else_branch') ? initial_values.else_branch : CL2.NOVALUE)
            CL2.attach( self,"else_branch",else_branch )
            let _else = CL2.create_cell(initial_values.hasOwnProperty('_else') ? initial_values._else : CL2.NOVALUE)
            CL2.attach( self,"_else",_else )
        // end input params
        let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
        CL2.attach( self,"output",output )
        let current_state = CL2.create_cell(initial_values.hasOwnProperty('current_state') ? initial_values.current_state : 0)
        CL2.attach( self,"current_state",current_state )
        let current_parent = CL2.create_cell(initial_values.hasOwnProperty('current_parent') ? initial_values.current_parent : CL2.NOVALUE)
        CL2.attach( self,"current_parent",current_parent )
        /// object r_else_obj
        let r_else_obj = create_react( {input: CL2.NOVALUE,action: (val) => { 
    // if (debug)
    // console.log("r1")
    let s1 = val.value.subscribe( (ev) => {
      //console.log("r2",ev)
      else_branch.set( ev )
    })
   },$title: 'r_else_obj[react]'} )
        self.append(r_else_obj)
        CL2.attach_anonymous( self, r_else_obj)
        function cleanup_current_parent() { 
    //console.log("cleanup_current_parent",current_parent.get())
      if (current_parent.is_set) {
          let cp = current_parent.get()
          cp.destroy()
          current_parent.set( null )
        }
     }
        CL2.attach( self,"cleanup_current_parent",cleanup_current_parent )
              /// type cleanup_current_parent
              function create_cleanup_current_parent( initial_values )
              {
                let self=CL2.create_item(); self.$title=initial_values.$title
                // inner children
                    // input params
                        let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                        CL2.attach( self,"rest",rest )
                    // end input params
                    let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
                    CL2.attach( self,"output",output )
                    /// object vals
                    let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
                    self.append(vals)
                    CL2.attach_anonymous( self, vals)
                    /// object r
                    let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! cleanup_current_parent args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return cleanup_current_parent( ...args ) 
  	   },$title: 'r[react]'} )
                    self.append(r)
                    CL2.attach_anonymous( self, r)
                    let _bind_87 = CL2.create_binding(r.output,output)
                    CL2.attach( self,"_bind_87",_bind_87 )
                  //bindings from vals
                  vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
                  //bindings from r
                  r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
                return self
              }
        function activate_branch(branch_value,arg) { 
      cleanup_current_parent()

      //console.log("activate-branch: ",branch_value)
      if (branch_value === CL2.NOVALUE) {
        self.output.submit()
        return
      }

      // если подали не функцию - ну вернем что подали.
      // if cond 10 else 20
      if (typeof(branch_value) !== "function") {
        self.output.submit( branch_value )
        return
      }

      let cp = CL2.create_item()
      self.append( cp )
      current_parent.set( cp )

      //let arg_cell = CL2.create_cell( arg )
      //CL2.attach_anonymous( cp, arg_cell )

      let res = branch_value( cp, arg )
      // cp то надо или нет уже
      if (res instanceof CL2.Comm) {
        let b = CL2.create_binding( res, self.output )
        CL2.attach_anonymous( cp, b )
        // по идее при удалении биндинг удалится
      }
   }
        CL2.attach( self,"activate_branch",activate_branch )
              /// type activate_branch
              function create_activate_branch( initial_values )
              {
                let self=CL2.create_item(); self.$title=initial_values.$title
                // inner children
                    // input params
                        let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                        CL2.attach( self,"rest",rest )
                    // end input params
                    let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
                    CL2.attach( self,"output",output )
                    /// object vals
                    let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
                    self.append(vals)
                    CL2.attach_anonymous( self, vals)
                    /// object r
                    let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! activate_branch args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return activate_branch( ...args ) 
  	   },$title: 'r[react]'} )
                    self.append(r)
                    CL2.attach_anonymous( self, r)
                    let _bind_90 = CL2.create_binding(r.output,output)
                    CL2.attach( self,"_bind_90",_bind_90 )
                  //bindings from vals
                  vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
                  //bindings from r
                  r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
                return self
              }
        /// object r_on_then_val
        let r_on_then_val = create_react( {input: CL2.NOVALUE,action: (value) => { 
    if (current_state.get() == 1) {
      activate_branch( then_branch.get(), condition.get() )
    }
   },$title: 'r_on_then_val[react]'} )
        self.append(r_on_then_val)
        CL2.attach_anonymous( self, r_on_then_val)
        /// object r_on_else_val
        let r_on_else_val = create_react( {input: CL2.NOVALUE,action: (value) => { 
    //console.log("else_value changed:",else_value.get(),"current_state.get()=",current_state.get(),"condition=",condition.get())
    if (current_state.get() == 2) {
      //console.
      activate_branch( else_branch.get(), condition.get() )
    }
   },$title: 'r_on_else_val[react]'} )
        self.append(r_on_else_val)
        CL2.attach_anonymous( self, r_on_else_val)
        /// object r_on_cond
        let r_on_cond = create_react( {input: CL2.NOVALUE,action: (value) => { 
    // console.log("if react on condition",value + "",current_state.get(),"self=",self+"",'then=',then_branch.get())
    // console.trace()
    if (value) {
      if (current_state.get() != 1) {
        //console.log("if activating branch then",value,"then-value=",then_value.get(),"then-block=",then_block.get())
        activate_branch( then_branch.get(), value )
        current_state.set( 1 )
      }
    } else {
      if (current_state.get() != 2) {
        // ну пока так..
        //let els_value = _else.get() ? _else.get().value.get() : else_value.get()
        activate_branch( else_branch.get(), value )
        //activate_branch( else_value.get(), value )
        current_state.set( 2 )
      }
    }
   },$title: 'r_on_cond[react]'} )
        self.append(r_on_cond)
        CL2.attach_anonymous( self, r_on_cond)
      //bindings from r_else_obj
      r_else_obj.release.once( CL2.create_binding( _else, r_else_obj.input ).unsub ) // hehe objid=r_else_obj prefix=
      //bindings from r_on_then_val
      r_on_then_val.release.once( CL2.create_binding( then_branch, r_on_then_val.input ).unsub ) // hehe objid=r_on_then_val prefix=
      //bindings from r_on_else_val
      r_on_else_val.release.once( CL2.create_binding( else_branch, r_on_else_val.input ).unsub ) // hehe objid=r_on_else_val prefix=
      //bindings from r_on_cond
      r_on_cond.release.once( CL2.create_binding( condition, r_on_cond.input ).unsub ) // hehe objid=r_on_cond prefix=
    return self
  }

  function find_return_scope(start) { 
    start ||= self
    let p = start.parent && start.parent.is_set ? start.parent.get() : start.attached_to
    // console.log('============ return acting',self+"",self)
    // console.log("============ return reacting", p+"")
    // console.trace()
    while (p) {
      //console.log("=========== return checking p=",p+"")
      if (p.output && p.is_return_scope) {
        return p
      }
      //console.log("it has no ouytput",JSON.stringify(p))
      p = p.parent ? p.parent.get() : p.attached_to
    }
 }
  CL2.attach( self,"find_return_scope",find_return_scope )
        /// type find_return_scope
        function create_find_return_scope( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! find_return_scope args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return find_return_scope( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_93 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_93",_bind_93 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  /// type block
  function create_block( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
            CL2.attach( self,"output",output )
        // end input params
    return self
  }

  /// type when_all
  function create_when_all( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
            CL2.attach( self,"rest",rest )
        // end input params
        let output = CL2.create_channel()
        CL2.attach( self,"output",output )
        let init = 
        () => {  
    let unsub = () => {}
    rest.subscribe( (list) => {      
      unsub()
      let q = CL2.when_all( list )
      // вот все-таки порты LF и наши каналы это разное. 
      // ибо порты их держат сооощение 1 такт. и это прикольно.
      // а нас пока спасает что там внутри - delayed стоит.
      let b = CL2.create_binding( q, output )
      unsub = () => { q.destroy(); b.destroy() }
    })
    self.release.subscribe( () => unsub() )
   }
        init(self)
    return self
  }

  function read(x) {  return x  }
  CL2.attach( self,"read",read )
        /// type read
        function create_read( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! read args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return read( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_96 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_96",_bind_96 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  /// type apply
  function create_apply( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let action = CL2.create_cell(initial_values.hasOwnProperty('action') ? initial_values.action : CL2.NOVALUE)
            CL2.attach( self,"action",action )
            let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
            CL2.attach( self,"rest",rest )
        // end input params
        /// object u
        let u = create_extract( {input: CL2.NOVALUE,$title: 'u[extract]'} )
        self.append(u)
        CL2.attach_anonymous( self, u)
        let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
        CL2.attach( self,"output",output )
        /// object xx
        let xx = create_react( {input: CL2.NOVALUE,action: () => { 
      
      let f = action.get()
      let args = u.output.get()
      //console.log("x-apply",f,args)

      if (f && args) {
        let res = f( ...args )
        //console.log("apply res=",res,"f=",f)
        // типа если вернули канал - то зацепку за его значение нам обеспечит react
        return res
        /*
        
        //if (f.awaitable) res.then(val => output.set( val ))
        // console.log("CCC f.is_task_function=",f.is_task_function,"f=",f)
        if (f.is_task_function && res instanceof CL2.Comm) {
          console.log("task fn!",res + "")
          // вернули канал? слушаем его дальше..
          let unsub = res.once( (val) => {
            console.log("once",val)
            output.set( val )
          })
        }
        else
          output.set( res )
        */  

      } 
     },$title: 'xx[react]'} )
        self.append(xx)
        CL2.attach_anonymous( self, xx)
        // nested objs of xx
          /// object _when_all_22
          let _when_all_22 = create_when_all( {$title: '_when_all_22'} )
          xx.append(_when_all_22)
          CL2.attach_anonymous( xx, _when_all_22)
        let _bind_23 = CL2.create_binding(xx.output,output)
        CL2.attach( self,"_bind_23",_bind_23 )
      //bindings from u
      u.release.once( CL2.create_binding( rest, u.input ).unsub ) // hehe objid=u prefix=
      //bindings from xx
      xx.release.once( CL2.create_binding( _when_all_22.output, xx.input ).unsub ) // hehe objid=xx prefix=
        let _when_all_22_rest = CL2.create_cell( [action,u.output] )
        _when_all_22_rest.$title="rest"; _when_all_22_rest.attached_to = _when_all_22
        //bindings from _when_all_22
        _when_all_22.release.once( CL2.create_binding( _when_all_22_rest, _when_all_22.rest ).unsub ) // hehe objid=_when_all_22 prefix=
    return self
  }

  function plus(...values) {     
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum + values[i]      
  return sum
 }
  CL2.attach( self,"plus",plus )
        /// type plus
        function create_plus( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! plus args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return plus( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_99 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_99",_bind_99 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function minus(...values) {   
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum - values[i]      
  return sum
 }
  CL2.attach( self,"minus",minus )
        /// type minus
        function create_minus( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! minus args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return minus( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_102 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_102",_bind_102 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function mul(...values) {   
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum * values[i]      
  return sum
 }
  CL2.attach( self,"mul",mul )
        /// type mul
        function create_mul( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! mul args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return mul( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_105 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_105",_bind_105 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function div(...values) {   
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum / values[i]      
  return sum
 }
  CL2.attach( self,"div",div )
        /// type div
        function create_div( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! div args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return div( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_108 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_108",_bind_108 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function and(...values) {    
   for (let i=0; i<values.length; i++)
     if (!(values[i])) return false
   return true
 }
  CL2.attach( self,"and",and )
        /// type and
        function create_and( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! and args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return and( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_111 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_111",_bind_111 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function or(...values) {    
  //console.log("or checking",values)
   for (let i=0; i<values.length; i++)
     if (values[i]) return values[i]
   return false
 }
  CL2.attach( self,"or",or )
        /// type or
        function create_or( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! or args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return or( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_114 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_114",_bind_114 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function not(value) {    
   return (!value)
 }
  CL2.attach( self,"not",not )
        /// type not
        function create_not( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! not args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return not( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_117 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_117",_bind_117 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function equal(...values) { 
   // какое надо equals? строгое или нестрогое?
   // сделал пока строгое
   for (let i=1; i<values.length; i++)
     if (!(values[i] === values[i-1])) return false
   return true  
 }
  CL2.attach( self,"equal",equal )
        /// type equal
        function create_equal( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! equal args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return equal( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_120 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_120",_bind_120 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function not_equal(...values) { 
   // какое надо equals? строгое или нестрогое?
   // здесь сделаем нестрогое
   for (let i=1; i<values.length; i++)
     if ((values[i] == values[i-1])) return false
   return true  
 }
  CL2.attach( self,"not_equal",not_equal )
        /// type not_equal
        function create_not_equal( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! not_equal args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return not_equal( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_123 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_123",_bind_123 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function less(...values) { 
   // какое надо equals? строгое или нестрогое?
   // сделал пока строгое
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] < values[i])) return false
   return true
 }
  CL2.attach( self,"less",less )
        /// type less
        function create_less( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! less args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return less( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_126 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_126",_bind_126 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function less_equal(...values) { 
   // какое надо equals? строгое или нестрогое?
   // сделал пока строгое
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] <= values[i])) return false
   return true
 }
  CL2.attach( self,"less_equal",less_equal )
        /// type less_equal
        function create_less_equal( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! less_equal args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return less_equal( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_129 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_129",_bind_129 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function more(...values) { 
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] > values[i])) return false
   return true
 }
  CL2.attach( self,"more",more )
        /// type more
        function create_more( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! more args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return more( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_132 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_132",_bind_132 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  function more_equal(...values) { 
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] >= values[i])) return false
   return true
 }
  CL2.attach( self,"more_equal",more_equal )
        /// type more_equal
        function create_more_equal( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! more_equal args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return more_equal( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_135 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_135",_bind_135 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }


  /// type submit_events
  function create_submit_events( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let input = CL2.create_cell(initial_values.hasOwnProperty('input') ? initial_values.input : CL2.NOVALUE)
            CL2.attach( self,"input",input )
        // end input params
        let output = CL2.create_channel()
        CL2.attach( self,"output",output )
        /// object _react_51
        let _react_51 = create_react( {input: CL2.NOVALUE,action: (arr) => { 
    arr.map( v => output.submit( v ) )
   },$title: '_react_51'} )
        self.append(_react_51)
        CL2.attach_anonymous( self, _react_51)
      //bindings from _react_51
      _react_51.release.once( CL2.create_binding( input, _react_51.input ).unsub ) // hehe objid=_react_51 prefix=
    return self
  }

  /// type gather_events
  function create_gather_events( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let input = CL2.create_channel()
            CL2.attach( self,"input",input )
        // end input params
        let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : [])
        CL2.attach( self,"output",output )
        /// object _react_54
        let _react_54 = create_react( {input: CL2.NOVALUE,action: (val) => { 
    let arr = output.get();
    arr.push( val ); 
    output.set( arr.slice(0) ) 
    // slice(0) конечно это ваще.. но иначе change-проверка не поймет смены..
    // а даже если здесь поймет то дальше не поймет.. это надо как-то особо обработать..
    // мб идея - поле для массива с его версией.
   },$title: '_react_54'} )
        self.append(_react_54)
        CL2.attach_anonymous( self, _react_54)
      //bindings from _react_54
      _react_54.release.once( CL2.create_binding( input, _react_54.input ).unsub ) // hehe objid=_react_54 prefix=
    return self
  }

  /// type reduce_events
  function create_reduce_events( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let input = CL2.create_channel()
            CL2.attach( self,"input",input )
            let init = CL2.create_cell(initial_values.hasOwnProperty('init') ? initial_values.init : CL2.NOVALUE)
            CL2.attach( self,"init",init )
            let f = CL2.create_cell(initial_values.hasOwnProperty('f') ? initial_values.f : CL2.NOVALUE)
            CL2.attach( self,"f",f )
        // end input params
        let acc = CL2.create_cell(initial_values.hasOwnProperty('acc') ? initial_values.acc : CL2.NOVALUE)
        CL2.attach( self,"acc",acc )
        let _bind_57 = CL2.create_binding(init,acc)
        CL2.attach( self,"_bind_57",_bind_57 )
        let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
        CL2.attach( self,"output",output )
        let _bind_58 = CL2.create_binding(acc,output)
        CL2.attach( self,"_bind_58",_bind_58 )
        /// object _react_59
        let _react_59 = create_react( {input: CL2.NOVALUE,action: (value) => { 
    let new_acc = f.get().call( this, value, acc.get() )
    // привет, тут промиса будет от кофункций. и что делать?
    if (new_acc instanceof CL2.Comm) {
      new_acc.once( val => {
        acc.set( new_acc )
        // надо какой-то режим буферизации.. чтобы может быть react функцию просто не вызывал
        // пока мы тут не закончим.. а буферизировал скажем.. todo
      })
    }
    else
      acc.set( new_acc )
   },$title: '_react_59'} )
        self.append(_react_59)
        CL2.attach_anonymous( self, _react_59)
      //bindings from _react_59
      _react_59.release.once( CL2.create_binding( input, _react_59.input ).unsub ) // hehe objid=_react_59 prefix=
    return self
  }

  function arrays_equal(a,b) { 
  if (Array.isArray(a) && Array.isArray(b) && a.length == b.length) {
    for (let i=0; i<a.length; i++)
      if (a[i] != b[i]) return false
    return true
  }
  return false
 }
  CL2.attach( self,"arrays_equal",arrays_equal )
        /// type arrays_equal
        function create_arrays_equal( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! arrays_equal args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return arrays_equal( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_138 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_138",_bind_138 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function list_to_dict(nodes) { 
   let h = {}
   for (let k of nodes) {
      h[ k[0] ] = k[1] 
   }
   return h   
 }
  CL2.attach( self,"list_to_dict",list_to_dict )
        /// type list_to_dict
        function create_list_to_dict( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! list_to_dict args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return list_to_dict( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_141 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_141",_bind_141 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function keys(obj) { 
  if (Array.isArray(obj)) return [...Array( obj.length ).keys()]
  if (obj instanceof Map) return obj.keys()
  if (obj instanceof Set) return obj.keys()  
  return Object.keys(obj)
 }
  CL2.attach( self,"keys",keys )
        /// type keys
        function create_keys( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! keys args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return keys( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_144 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_144",_bind_144 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function values(obj) { 
  if (Array.isArray(obj)) return obj
  if (obj instanceof Map) return obj.values()
  if (obj instanceof Set) return obj.keys()  
  return Object.values(obj)
 }
  CL2.attach( self,"values",values )
        /// type values
        function create_values( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! values args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return values( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_147 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_147",_bind_147 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function concat(a,b) {  
   //console.log('concat',a,b)
   if (Array.isArray(a)) return [...a,...b]
   if (a instanceof Set) return {...a,...b}
   if (typeof(a) == "object") return {...a,...b}
   console.error("a=",a,"b=",b)
   throw `concat: incompatible types.`
 }
  CL2.attach( self,"concat",concat )
        /// type concat
        function create_concat( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! concat args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return concat( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_150 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_150",_bind_150 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function range(max) { 
  let arr = new Array(max)
  for (let i=0; i<max; i++) arr[i] = i
  return arr
 }
  CL2.attach( self,"range",range )
        /// type range
        function create_range( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! range args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return range( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_153 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_153",_bind_153 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function len(obj) { 
    if (Array.isArray(obj)) return obj.length
    if (obj instanceof Map) return obj.size()
    if (obj instanceof Set) return obj.size()
    return Object.keys(obj).length
 }
  CL2.attach( self,"len",len )
        /// type len
        function create_len( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! len args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return len( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_156 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_156",_bind_156 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function join(obj,sep) { 
    return obj.join(sep)
 }
  CL2.attach( self,"join",join )
        /// type join
        function create_join( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! join args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return join( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_159 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_159",_bind_159 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function flatten(obj) { 
    return obj.flatten()
 }
  CL2.attach( self,"flatten",flatten )
        /// type flatten
        function create_flatten( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! flatten args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return flatten( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_162 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_162",_bind_162 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  /// type dict
  function create_dict( initial_values )
  {
    let self=CL2.create_item(); self.$title=initial_values.$title
    // inner children
        // input params
            let rest_pos = CL2.create_cell(initial_values.hasOwnProperty('rest_pos') ? initial_values.rest_pos : CL2.NOVALUE)
            CL2.attach( self,"rest_pos",rest_pos )
            let rest_all = CL2.create_cell(initial_values.hasOwnProperty('rest_all') ? initial_values.rest_all : CL2.NOVALUE)
            CL2.attach( self,"rest_all",rest_all )
        // end input params
        let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
        CL2.attach( self,"output",output )
        let merged = CL2.create_cell(); merged.$title='merged'
        CL2.attach( self,"merged",merged )
        /// object _apply_74
        let _apply_74 = create_apply( {action: (list,kv) => { 
      if (list.length == 0) return kv
      //if (Object.keys(kv))
      let h = {...kv}
      if (list.length == 1) // случай dict arr
      {
        let nodes = list[0]
        for (let k of nodes) {
              h[ k[0] ] = k[1] 
        }
      }
      else
      for (let i=0; i<list.length; i+=2) // значения из позиционных аргументов
        h[ list[i] ] = list[i+1]

      return h
   },$title: '_apply_74'} )
        self.append(_apply_74)
        CL2.attach_anonymous( self, _apply_74)
        // nested objs of _apply_74
          /// object _extract_72
          let _extract_72 = create_extract( {input: CL2.NOVALUE,$title: '_extract_72'} )
          _apply_74.append(_extract_72)
          CL2.attach_anonymous( _apply_74, _extract_72)
          /// object _extract_73
          let _extract_73 = create_extract( {input: CL2.NOVALUE,$title: '_extract_73'} )
          _apply_74.append(_extract_73)
          CL2.attach_anonymous( _apply_74, _extract_73)
        let _bind_75 = CL2.create_binding(merged,output)
        CL2.attach( self,"_bind_75",_bind_75 )
      let _apply_74_rest = CL2.create_cell( [_extract_72.output,_extract_73.output] )
      _apply_74_rest.$title="rest"; _apply_74_rest.attached_to = _apply_74
      //bindings from _apply_74
      _apply_74.release.once( CL2.create_binding( _apply_74_rest, _apply_74.rest ).unsub ) // hehe objid=_apply_74 prefix=
      CL2.create_binding( _apply_74.output, merged ) // from let_next
        //bindings from _extract_72
        _extract_72.release.once( CL2.create_binding( rest_pos, _extract_72.input ).unsub ) // hehe objid=_extract_72 prefix=
        //bindings from _extract_73
        _extract_73.release.once( CL2.create_binding( rest_all, _extract_73.input ).unsub ) // hehe objid=_extract_73 prefix=
    return self
  }

  function list(...values) {  return values  }
  CL2.attach( self,"list",list )
        /// type list
        function create_list( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! list args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return list( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_165 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_165",_bind_165 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function get(src,field) {  
    //let val = src[field] 
    return src[field] 
 }
  CL2.attach( self,"get",get )
        /// type get
        function create_get( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! get args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return get( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_168 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_168",_bind_168 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function slice(list,start,length) {  return list.slice( start,length )  }
  CL2.attach( self,"slice",slice )
        /// type slice
        function create_slice( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! slice args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return slice( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_171 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_171",_bind_171 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function map(arr,f) { 
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,index) {
    return new Promise( (resolve,reject) => {
    let result = f( e,index )
    if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0 ) {
    if (i >= arr.length) return Promise.resolve([])

    return process_elem( arr[i],i ).then( (result) => {
      return process_arr( arr,i+1 ).then( (rest_result) => {
        return [result,...rest_result]
      })      
    })
  }

  function process_dict( arr,names,i=0 ) {
    if (i >= arr.length) return Promise.resolve([])

    return process_elem( arr[i],names[i] ).then( (result) => {
      return process_dict( arr,names, i+1 ).then( (rest_result) => {
        return [result,...rest_result]
      })
    })
  }  

  let output = CL2.create_cell()
  // [...arr] переводит в массив принудительно, если там было Set например
  if (!Array.isArray(arr)) {
    if (arr instanceof Set)
        arr = [...arr]
  }
  if (typeof(arr) == "object") 
    process_dict( Object.values(arr), Object.keys(arr) ).then( values => output.submit( values ))
  else  
    process_arr( arr ).then( values => output.submit( values ))
  return output
 }
  CL2.attach( self,"map",map )
        /// type map
        function create_map( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! map args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return map( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_174 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_174",_bind_174 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function filter(arr,f) { 
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e, index) {
    return new Promise( (resolve,reject) => {
    let result = f( e, index )
    if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0 ) {
    if (i >= arr.length) return Promise.resolve([])

    return process_elem( arr[i] ).then( (result) => {
      return process_arr( arr,i+1 ).then( (rest_result) => {
        if (result)
          return [arr[i], ...rest_result]
        return rest_result
      })      
    })
  }

  let output = CL2.create_cell()
  if (!Array.isArray(arr)) arr = [...arr]
  process_arr( arr ).then( values => output.submit( values ))
  return output
 }
  CL2.attach( self,"filter",filter )
        /// type filter
        function create_filter( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! filter args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return filter( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_177 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_177",_bind_177 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  function reduce(arr,acc_init,f) { 
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,index,acc) {
    return new Promise( (resolve,reject) => {

    let result = f( e, index, acc )
    if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0,acc ) {
    if (i >= arr.length) return Promise.resolve(acc)

    return process_elem( arr[i],i,acc ).then( (result) => {
      return process_arr( arr,i+1,result )
    })
  }

  function process_dict( arr,names,i=0,acc ) {
    if (i >= arr.length) return Promise.resolve(acc)

    return process_elem( arr[i],names[i],acc ).then( (result) => {
      return process_dict( arr,names, i+1, result )
    })
  }  

  let output = CL2.create_cell()
  // [...arr] переводит в массив принудительно, если там было Set например
  if (!Array.isArray(arr)) {
    if (arr instanceof Set)
        arr = [...arr]
  }
  if (typeof(arr) == "object") 
    process_dict( Object.values(arr), Object.keys(arr),0,acc_init ).then( values => output.submit( values ))
  else  
    process_arr( arr,0,acc_init ).then( values => output.submit( values ))
  return output  
 }
  CL2.attach( self,"reduce",reduce )
        /// type reduce
        function create_reduce( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! reduce args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }

  	    return reduce( ...args ) 
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_180 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_180",_bind_180 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }



  export function fib(n) { // cofunc from 1: func "fib" { n |
  let func_self = {$title: 'cofunc_action'}
  let return_scope = func_self
  let exit_scope = func_self
  let output = CL2.create_cell();
  CL2.attach( func_self,'output',output )
  
  output.subscribe( val => console.log('fib inner output changed',val,func_self.output+'') )

    /// object _print_182
    let _print_182 = create_print( {$title: '_print_182'} )
    CL2.attach_anonymous( func_self, _print_182)
      let pos_cell__print_182_0 = CL2.create_cell( 'fib called')
      pos_cell__print_182_0.$title="pos_cell_0"; pos_cell__print_182_0.attached_to=_print_182
      let pos_cell__print_182_1 = CL2.create_cell( n)
      pos_cell__print_182_1.$title="pos_cell_1"; pos_cell__print_182_1.attached_to=_print_182
    _print_182.task_mode = true
    // return at 3:   return (if (@n > 1) {
      /// object _if_191
      let _if_191 = create_if( {condition: CL2.NOVALUE,then_branch: () => { // cofunc from 3:   return (if (@n > 1) {
  let func_self = {$title: 'cofunc_action'}
  let return_scope = func_self
  
  let output = CL2.create_cell();
  CL2.attach( func_self,'output',output )

    let res = CL2.create_cell(); res.$title='res'
    CL2.attach( func_self,"res",res )
    /// object _fib_186
    let _fib_186 = create_fib( {$title: '_fib_186'} )
    CL2.attach_anonymous( func_self, _fib_186)
    _fib_186.task_mode = true
    // nested objs of _fib_186
      /// object _45_185
      let _45_185 = create_minus( {$title: '_45_185[-]'} )
      _fib_186.append(_45_185)
      CL2.attach_anonymous( _fib_186, _45_185)
        let pos_cell__45_185_0 = CL2.create_cell( n)
        pos_cell__45_185_0.$title="pos_cell_0"; pos_cell__45_185_0.attached_to=_45_185
        let pos_cell__45_185_1 = CL2.create_cell( 1)
        pos_cell__45_185_1.$title="pos_cell_1"; pos_cell__45_185_1.attached_to=_45_185
      _45_185.task_mode = true
    /// object _43_187
    let _43_187 = create_plus( {rest: [],$title: '_43_187[+]'} )
    CL2.attach_anonymous( func_self, _43_187)
    _43_187.task_mode = true
    /// object _fib_189
    let _fib_189 = create_fib( {$title: '_fib_189'} )
    CL2.attach_anonymous( func_self, _fib_189)
    _fib_189.task_mode = true
    // nested objs of _fib_189
      /// object _45_188
      let _45_188 = create_minus( {$title: '_45_188[-]'} )
      _fib_189.append(_45_188)
      CL2.attach_anonymous( _fib_189, _45_188)
        let pos_cell__45_188_0 = CL2.create_cell( n)
        pos_cell__45_188_0.$title="pos_cell_0"; pos_cell__45_188_0.attached_to=_45_188
        let pos_cell__45_188_1 = CL2.create_cell( 2)
        pos_cell__45_188_1.$title="pos_cell_1"; pos_cell__45_188_1.attached_to=_45_188
      _45_188.task_mode = true
    // return at 6:     return @res
    res.once( val => return_scope.output.submit( val ) )
  let _fib_186_rest = CL2.create_cell( [_45_185.output] )
  _fib_186_rest.$title="rest"; _fib_186_rest.attached_to = _fib_186
  //bindings from _fib_186
  _fib_186.release.once( CL2.create_binding( _fib_186_rest, _fib_186.rest ).unsub ) // hehe objid=_fib_186 prefix=
  CL2.create_binding( _fib_186.output, res ) // from let_next
    let _45_185_rest = CL2.create_cell( [pos_cell__45_185_0,pos_cell__45_185_1] )
    _45_185_rest.$title="rest"; _45_185_rest.attached_to = _45_185
    //bindings from _45_185
    _45_185.release.once( CL2.create_binding( _45_185_rest, _45_185.rest ).unsub ) // hehe objid=_45_185 prefix=
  let _fib_189_rest = CL2.create_cell( [_45_188.output] )
  _fib_189_rest.$title="rest"; _fib_189_rest.attached_to = _fib_189
  //bindings from _fib_189
  _fib_189.release.once( CL2.create_binding( _fib_189_rest, _fib_189.rest ).unsub ) // hehe objid=_fib_189 prefix=
    let _45_188_rest = CL2.create_cell( [pos_cell__45_188_0,pos_cell__45_188_1] )
    _45_188_rest.$title="rest"; _45_188_rest.attached_to = _45_188
    //bindings from _45_188
    _45_188.release.once( CL2.create_binding( _45_188_rest, _45_188.rest ).unsub ) // hehe objid=_45_188 prefix=


return output
 },$title: '_if_191'} )
      CL2.attach_anonymous( func_self, _if_191)
      _if_191.task_mode = true
      // nested objs of _if_191
        /// object _62_183
        let _62_183 = create_more( {$title: '_62_183[>]'} )
        _if_191.append(_62_183)
        CL2.attach_anonymous( _if_191, _62_183)
          let pos_cell__62_183_0 = CL2.create_cell( n)
          pos_cell__62_183_0.$title="pos_cell_0"; pos_cell__62_183_0.attached_to=_62_183
          let pos_cell__62_183_1 = CL2.create_cell( 1)
          pos_cell__62_183_1.$title="pos_cell_1"; pos_cell__62_183_1.attached_to=_62_183
        _62_183.task_mode = true
      /// object _else_193
      let _else_193 = create_else( {value: () => { // cofunc from 7:   } else { return @n })
  let func_self = {$title: 'cofunc_action_else'}
  let return_scope = func_self
  
  let output = CL2.create_cell();
  CL2.attach( func_self,'output',output )

    // return at 7:   } else { return @n })
    console.log('else sending to return scope',n,return_scope.output+'')
    return_scope.output.submit( n )


return output
 },$title: '_else_193'} )
      CL2.attach_anonymous( func_self, _else_193)
      _if_191._else.set( _else_193 )
      _else_193.task_mode = true
    _if_191.output.once( val => return_scope.output.submit( val ) )
  let _print_182_rest = CL2.create_cell( [pos_cell__print_182_0,pos_cell__print_182_1] )
  _print_182_rest.$title="rest"; _print_182_rest.attached_to = _print_182
  //bindings from _print_182
  _print_182.release.once( CL2.create_binding( _print_182_rest, _print_182.rest ).unsub ) // hehe objid=_print_182 prefix=
    //bindings from _if_191
    _if_191.release.once( CL2.create_binding( _62_183.output, _if_191.condition ).unsub ) // hehe objid=_if_191 prefix=
      let _62_183_rest = CL2.create_cell( [pos_cell__62_183_0,pos_cell__62_183_1] )
      _62_183_rest.$title="rest"; _62_183_rest.attached_to = _62_183
      //bindings from _62_183
      _62_183.release.once( CL2.create_binding( _62_183_rest, _62_183.rest ).unsub ) // hehe objid=_62_183 prefix=


return output
 }
  CL2.attach( self,"fib",fib )
        /// type fib
        export function create_fib( initial_values )
        {
          let self=CL2.create_item(); self.$title=initial_values.$title
          // inner children
              // input params
                  let rest = CL2.create_cell(initial_values.hasOwnProperty('rest') ? initial_values.rest : CL2.NOVALUE)
                  CL2.attach( self,"rest",rest )
              // end input params
              let output = CL2.create_cell(initial_values.hasOwnProperty('output') ? initial_values.output : CL2.NOVALUE)
              CL2.attach( self,"output",output )
              /// object vals
              let vals = create_extract( {input: CL2.NOVALUE,$title: 'vals[extract]'} )
              self.append(vals)
              CL2.attach_anonymous( self, vals)
              /// object r
              let r = create_react( {input: CL2.NOVALUE,action: (args) => { 
  	    if (self.task_mode) {
  	    	// console.log('ok taskj')
  	    	//r.destroy() // один раз отреагировали и хватит. но это странно 
  	    	vals.destroy() // попробем вот что отменить.. F-FUNC-ONCE
  	    	if (self.started)
  	    		 console.log('FUNC duplicate call!! fib args=',args,'prev-args=',self.started)
  	    	self.started = args
  	    }
 
        console.log('fib caller calling fib',...args)
  	    let rrr= fib( ...args ) 
  	    console.log('fib caller got result',rrr+'')
  	    return rrr
  	   },$title: 'r[react]'} )
              self.append(r)
              CL2.attach_anonymous( self, r)
              let _bind_200 = CL2.create_binding(r.output,output)
              CL2.attach( self,"_bind_200",_bind_200 )
            //bindings from vals
            vals.release.once( CL2.create_binding( rest, vals.input ).unsub ) // hehe objid=vals prefix=
            //bindings from r
            r.release.once( CL2.create_binding( vals.output, r.input ).unsub ) // hehe objid=r prefix=
          return self
        }

  let x = CL2.create_cell(); x.$title='x'

  /// object _fib_197
  let _fib_197 = create_fib( {$title: '_fib_197'} )
    let pos_cell__fib_197_0 = CL2.create_cell( 3)
    pos_cell__fib_197_0.$title="pos_cell_0"; pos_cell__fib_197_0.attached_to=_fib_197

  /// object _print_198
  let _print_198 = create_print( {$title: '_print_198'} )
    let pos_cell__print_198_0 = CL2.create_cell( 'x=')
    pos_cell__print_198_0.$title="pos_cell_0"; pos_cell__print_198_0.attached_to=_print_198

let _fib_197_rest = CL2.create_cell( [pos_cell__fib_197_0] )
_fib_197_rest.$title="rest"; _fib_197_rest.attached_to = _fib_197
//bindings from _fib_197
_fib_197.release.once( CL2.create_binding( _fib_197_rest, _fib_197.rest ).unsub ) // hehe objid=_fib_197 prefix=
CL2.create_binding( _fib_197.output, x ) // from let_next
_fib_197.output.subscribe( val => console.log('top-fib output changed',val) )
let _print_198_rest = CL2.create_cell( [pos_cell__print_198_0,x] )
_print_198_rest.$title="rest"; _print_198_rest.attached_to = _print_198
//bindings from _print_198
_print_198.release.once( CL2.create_binding( _print_198_rest, _print_198.rest ).unsub ) // hehe objid=_print_198 prefix=
