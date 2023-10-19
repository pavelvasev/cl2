obj "foo1" {
  in {
    a: cell 5
    ownname: cell "just1"
  }
  //output: cell 1
  init {: console.log("hello foo1",ownname.get()) :}
  
  //bind @ownname @output
  output := + "hello " @ownname
}

mixin "foo1"
obj "foo2" {
  print "foo2"
}

f2: foo2

print "f2.output=" @f2.output

assert (@f2.output == "hello just1")

/* пока убрал заменил на imixin
================
print "------- internal mixin with const"
===============

obj "foo3" {
  print "foo3"
  mixin {
    foo1 ownname="smiley"
  }
}

f3: foo3
print "f3.output=" @f3.output
assert (@f3.output == "hello smiley")
===============
print "------- internal mixin with link"
===============

obj "foo4" {
  in {
    name: cell
  }
  print "foo4"
  mixin {
    foo1 ownname=@name
  }
}

f4: foo4 "znak"
print "f4.output=" @f4.output
assert (@f4.output == "hello znak")
*/