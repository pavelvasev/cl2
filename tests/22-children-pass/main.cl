import std="std/std.cl"

obj "rr" {}

obj "foo" {
 in {
    a: cell
    b: cell
    cc&: cell
 }

 z: rr {

   init {: obj |
     cc.changed.on( (val) => {
       console.log("initing foo: calling it's children! for obj=",obj+"")
       let a1 = val(obj)
     })
   :}

 }

 rr_ch: cell
 bind @z.children @rr_ch
}

a: foo 1 2 {
  rr
  rr {
    print "hello from second rr"
  }
}

//std.print "children are" @a.z.children

print "a.z children are" @a.rr_ch
print "a children are" @a.children

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
