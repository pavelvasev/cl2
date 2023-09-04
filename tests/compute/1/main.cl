import std="std/std.cl"

func "less" {: a b |
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

apply (func { |z|
  print "hello-3" (apply (func {
      print "tick, z=" @z
      let x = 5
      let y = (std.add @x 5 @z)

      //return (if (less @y 12) "to-small" else "big")
      return (if (less @z 5) "z is too small" else { return (std.add @y 10) })
      //return (std.add @y 10)
    }))
}) (std.counter (std.timer interval=1000))


//std.apply {: console.log("hello") :}


/*
if (less 5 10) {
  print "TRUE"
} else {
  print "FALSE"
}
*/