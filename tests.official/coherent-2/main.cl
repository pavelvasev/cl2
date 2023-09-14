import std="std"
// F-COHERENT-MIND

let x := 5

a := @x + 1
b := (@x * 2) + @a

output := print "x=" @x "a=" @a "b=" @b
output_g := gather_events @output | join

react (std.timer n=1 start=100) {:
  console.log("setting x")
  x.set(10)
:}

react (std.timer n=2 start=20 period=300) { index|
  if (@index == 0) {
    print "rere" @output_g
  }
  if (@index == 1) {
    print "rere2" @output_g
    assert (@output_g == "x=,5,a=,6,b=,16,x=,10,a=,11,b=,31")
  }
  #assert (arrays_equal @output_g [ [ 'x=', 5, 'a=', 6, 'b=', 16 ], [ 'x=', 10, 'a=', 11, 'b=', 31 ] ])
  #
}