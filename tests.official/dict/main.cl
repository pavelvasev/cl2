import std="std"

y := 7
x := dict a=5 b=@y

print "x=" @x

r1: react (std.timer n=1 period=10) {:
  console.log("setting y")
  y.set(10)
:}

react (std.timer n=1 period=10 start=20) {
//r_check: react null {
  assert (apply {: x | console.log("checking x"); return x.a == 5 && x.b == 10 :} @x)
}

//bind @r1.output @r_check.input delay=1