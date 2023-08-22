import std="std/std.cl"

let a = 5

if @a {
  print "a is true"
} else {
  print "a is false"
}


react (if @a { return (std.counter (std.timer))}) {: val| a.set( false ); console.log("first react called",val) :}

//react @a.assigned {: val | console.log( "a have new value:",val) :}

react @a.assigned { |val|
  print "a had assigned value" @val
}