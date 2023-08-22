import std="std/std.cl"

obj "rr" {
}

obj "foo" {

 in {
    b&: cell
 }

 init {: obj |
   // CL.join( a,b )
   b.changed.on( (val) => {
     console.log("initing foo: calling b")
     let a1 = val( obj,CL2.create_cell(2),CL2.create_cell(2) )
   })
 :}

}

foo { |a b|
  std.print "called code" @a "+" @b "=" (std.add @a @b)
}

//std.apply (func { |x y| output: cell (std.add @x @y) })

// foo {: x y

//std.print "children are" @a.z.children

// std.print "a children are" @a.children
