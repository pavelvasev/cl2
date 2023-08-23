import std="std/std.cl"

print "hello" (std.apply (action { |z|
  let x = 5
  let y = (std.add @x 5 @z)
  return @y
}) 32 )