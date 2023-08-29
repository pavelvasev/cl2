import std="std/std.cl"

less: func {: a b |
  return a < b
:}

/*
print "hello-0"

print "hello" (std.apply (cofunc { |z|
  let x = 5
  let y = (std.add @x 5 @z)
  //return @y
  return (std.add @y 10)
}) 32 )

print "hello-2" (std.apply (cofunc { |z|
  print "tick"
  let x = 5
  let y = (std.add @x 5 @z)
  return (if (less @y 15) "to-small" else { return (std.add @y 10) })
  // return (if true { return (std.add @y 10) })
  //return (if true { return "OK" })
  // return (if false "to-small" else { return (std.add @y 10) })
  // return (std.add @y 50)
}) (std.counter (std.timer)) )
*/

apply (cofunc { |z|
  print "hello-3" (apply (cofunc {
      print "tick, z=" @z
      let x = 5
      let y = (std.add @x 5 @z)
      //return (if (less @y 12) "to-small" else "big")
      return (if (less @y 12) "to-small" else { return (std.add @y 10) })
      //return (std.add @y 10)
    }))
}) (std.counter (std.timer interval=10))


//std.apply {: console.log("hello") :}


/*
if (less 5 10) {
  print "TRUE"
} else {
  print "FALSE"
}
*/