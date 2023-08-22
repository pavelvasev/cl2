#!/bin/env node

import * as C from "./cl2-compiler.js"

let str = `

obj "extract" {
	input: cell // можно channel но монитору нужна ячейка
	output: cell

	o2: channel
	bind @o2 @output

	init "(obj) => {
		let p = CL2.monitor_rest_values( input, o2 )
		obj.release.on( p )
	}"
}

obj "timer" {

	//cells interval=1000 output=0
	interval: cell 1000
	output: channel

	init "(obj) => {
	obj.interval.changed.subscribe( f )
	let existing
	function stop() {
		if (existing) clearTimeout( existing )
			existing = null
	}
	function f() {
		stop()
		existing = setInterval( () => {
			obj.output.emit()
		}, obj.interval.get() )
	}
	obj.release.on( stop )
	f()
  }"
}

obj "counter" {
	input: channel
	value: cell 0
	//output: cell
	output: channel

	x: method "() => {
		self.value.set( self.value.get()+1 )
		return self.value.get()
	}"

	bind @input @x
	bind @value @output
}

obj "print" { 
  rest* : cell

  x: method "(values) => console.log(...values)"
  print_vals: extract @rest
  bind @print_vals @x
}


obj "add" {
  // rest* : cell
  // output: channel

	rest*: cell

	output: method '(values) => {
			let sum = values[0]
			for (let i=1; i<values.length; i++)
				sum = sum + values[i]
			return sum
	   }'

	u: extract @rest

  bind @u @output

	//bind @rest @output   
}


/*
obj "add" output=null *rest {

	x: method '(values) => {
			let sum = values[0]
			for (let i=1; i<values.length; i++)
				sum = sum + values[i]
			return sum
	   }'
	
  bind (get-values @rest) @x
  bind @x @output
}
*/

obj "foo" {
	  alfa: cell 100
	  sigma: cell "not-inited"
	  gamma: cell 2 
	  beta: cell 3
	  
	  print "alfa is" @alfa "sigma is" @sigma "gamma is" @gamma
}

//print "gamma is" @teta

foo alfa=(add @beta 10 (counter (timer interval=500))) sigma=(counter (timer) 111)
// interval=1250

//foo alfa="hi" sigma=14 gamma=@teta
//foo alfa=(add @beta 10) sigma=14 gamma=@teta
//foo alfa=(add @beta 10) sigma=(timer) gamma=@teta
let beta=15 teta=22
`

//import * as F from "./forms.js"

let dump = C.code2obj( str )
let jsarr = C.objs2js( dump )
let js = C.strarr2str( jsarr )

console.log("import * as CL2 from '../cl2.js'")
console.log(js)

/*
	  attach {
	  	alfa:  cell 0
	  	sigma: cell 0
	  	gamma: cell 0
	  }

*/

