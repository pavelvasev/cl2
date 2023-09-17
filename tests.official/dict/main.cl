import std="std"

y := 7
x := dict a=5 b=@y

print "x=" @x

r1: react (std.timer n=1 period=10) {:
  console.log("setting y")
  y.set(10)
:}

react (std.timer n=1 period=10 start=20) {
//r_check: react @r1.output {
  assert (apply {: x | console.log("checking x"); return x.a == 5 && x.b == 10 :} @x)
}

//bind @r1.output @r_check.input delay=1

=================
print "stage 2"

z := dict d=15 "a" 10 "b" 20 c=42
print "z=" @z

assert (and ((get @z "a") == 10) ((get @z "b") == 20) ((get @z "c") == 42))
print (keys @z)
assert (arrays_equal (keys @z) ['d','c','a','b'])
//(apply {: x | console.log("checking x"); return x.a == 5 && x.b == 10 :} @x)

===============
print "stage 3"

h := dict "a" (list 1 2 3) "b" (list 5 6 7)
print "h=" @h

g := list (dict 1 2 3 4) (dict 5 6 7 (list 8))
print "g=" @g

  ==== print "stage 3a"

h_s := apply {: x | return JSON.stringify(x) :} @h
print "h_s =" @h_s
assert (@h_s == '{\"a\":[1,2,3],\"b\":[5,6,7]}')

g_s := apply {: x | return JSON.stringify(x) :} @g
print "g_s =" @g_s
assert (@g_s == '[{\"1\":2,\"3\":4},{\"5\":6,\"7\":[8]}]')