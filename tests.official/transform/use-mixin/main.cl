obj "foo1" {
  a: cell 5
  init {: console.log("hello foo1") :}
}

mixin "foo1"
obj "foo2" {
  print "foo2"
}

foo2
