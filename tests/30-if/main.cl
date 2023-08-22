// F-IF

import std="std/std.cl"

let a = 5

if @a (block { |cond| print "hello cond is true, cond=" @cond }) (block { print "hello cond is false" })

/////////////////////////
print "test 2, value=" (if true 15 25) "value2=" (if @a "a is true")

///////////////////////////////////////
react (std.timer) {: a.set( false ) :}
react (std.timer interval=2500) {: a.set( true ) :}
/////////////////////////////////////

print "pipi=" (if @a {
  print "block-mode if: a is true"
  return 12
} else { return (std.add 32 15) } )
