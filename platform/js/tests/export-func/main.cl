import a = "./a.cl"

// todo:
// x := apply @a.foo 1
x := apply {: return a.foo(1) :}
print "x = " @x
assert (@x == 1)