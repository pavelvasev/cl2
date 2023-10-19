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

print "start"
================
print "------- internal mixin with const"
===============

obj "foo3" {
  print "foo3"
  imixin {
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
  imixin {
    foo1 ownname=@name
  }
}

f4: foo4 "znak"
print "f4.output=" @f4.output
assert (@f4.output == "hello znak")

===============
print "------- internal mixin to obj"
===============

obj "foo5" {
  print "foo5"
}

f5: foo5
imixin { foo1 ownname="mememe" } @f5
print "f5.output=" @f5.output
