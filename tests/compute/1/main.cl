import std="std/std.cl"

print "hello-0"

print "hello" (std.apply (cofunc { |z|
  let x = 5
  let y = (std.add @x 5 @z)
  //return @y
  return (std.add @y 10)
}) 32 )

less: func {: a b | return a < b :}

print "hello-2" (std.apply (cofunc { |z|
  print "tick"
  let x = 5
  let y = (std.add @x 5 @z)
  return (if true { return "OK" })
  //return (if false "to-small" else { return (std.add @y 10) })
  //return (std.add @y 10)
}) (std.counter (std.timer)) )

