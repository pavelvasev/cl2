import std="std/std.cl"

obj "rr" {}

obj "foo" {
 in {
    a: cell
    b: cell
 }
   init {: obj |
     b.changed.on( (val) => {
       console.log("initing foo: calling it's children! for obj=",obj+"",a.get(),"times")
       for (let i=0; i<a.get(); i++) {
         let a1 = val(obj)
       }
     })
   :}

}

a: foo 5 b={
  rr {
    std.print "hello from second rr"
  }
}

//std.print "children are" @a.z.children

std.print "a children are" @a.children

/*
react @a.rr_ch {: q |
  console.log("q! q=",q)
:}
*/
/*
react (std.timer) {:
  console.log("cc=",a.rr_ch.get() )
:}
*/
