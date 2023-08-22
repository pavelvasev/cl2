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