export var NOVALUE = {novalue: true}

// todo переделать bind. надо bind на target-object. и это зависит как бы от нас
// а нас подписать - это просто нам send послать.
// и тогда не надо будет делать проверку типов (кто нам посылает? надо знать на что у него подписаться).
// это позволит в частнои реализовать Н-модель. Раз на вход send - универсальный протокол.
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

if (process.env.VERBOSE) {
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
				dtgt.emit( [] )
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