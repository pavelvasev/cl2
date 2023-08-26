import std="std/std.cl"

print "hello-0"

print "hello" (std.apply (cofunc { |z|
  let x = 5
  let y = (std.add @x 5 @z)
  return @y
  //return (std.add @y 10)
}) 32 )

print "hello-2" (std.apply (cofunc { |z|
  let x = 5
  let y = (std.add @x 5 @z)
  return @y
  //return (std.add @y 10)
}) (std.counter (std.timer)) )