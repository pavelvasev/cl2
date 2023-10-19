#!/bin/env node

let a = create_channel()
let b = create_channel()

b.connect_to( a )
b.on( x => console.log("b pass",x) )
a.emit(33)
a.emit(47)

let c = create_method( (x) => x*x )

// ну и вопрос. у нас тут что, method connect to? но вообще это странно.
//но в целом метод может иметь свою ячейку канала вызова. о. пусть
//он имеет канал вызова
//c.call.connect_to(b)
create_binding( b, c )

// но вообще тогда напрашивается и канал результатов. ну а почему нет
c.result.on( console.log )
a.emit(10)

// ну вот. это довольно интересно. тут у нас и метод. и канал вызова его.
// и канал результатов даже имеется/
// и более того, мы этот метод привязывать сможем..
// ну вот завтра попривязываем. а так уже мило.

/// задача создать штуку считающую площать.
/*
let computer = create_object( 
	"w",create_cell(),
	"h",create_cell(),
	"area",create_cell(),
	"output",create_cell(),
	"compute",create_method( (a,b) => a*b ), /// ???
	create_binding( ... )
)
*/

// мб create_method( .. ).bind( )
// ну а может быть просто не так сразу.. а пока хотя бы как-нибудь
// ну т.е. нам нужна функция которая создаст интересующий объект.

// надо аргументы?
function create_area_computer() {
	let obj = create_object()
	obj.w = create_cell() // или таки embed?
	obj.h = create_cell()
	obj.output = create_cell()
	obj.compute = create_method( () => obj.w.get()*obj.h.get() )	
	//obj.compute = create_method( (a,b) => a*b )	
	create_binding( obj.compute, obj.output )
	create_binding( obj.w, obj.compute )
	create_binding( obj.h, obj.compute )
	//reaction( obj.w.changed, obj.h.changed, obj.compute.call )
	return obj
}
// по сути эта reaction это групповой биндинг. надо в это воткнуть щас.

let comp = create_area_computer()
//comp.output.bind( console.log ) // ну вот это красивое
comp.output.changed.on( console.log )
console.log("changing w")
comp.w.set( 10 )
console.log("changing h")
comp.h.set( 20 )