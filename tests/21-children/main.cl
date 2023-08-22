//import std="std/std.cl"

obj "foo" {
 in { 
    a: cell
    b: cell
    cc&: cell
 }
 x: func {: a1 a2 | return a1+a2 :}
 init {: obj |
   cc.changed.on( (val) => {
     console.log("initing foo: calling it's children twice!")
     let a1 = val(self)
     let a2 = val(self)
   })
 :}
}

foo 1 2 {
  foo 3 3 {
    print "hello 2"
  }
  print "hello 1"
}
// должно напечатать.. две единички и 4 двойки.