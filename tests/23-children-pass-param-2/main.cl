import std="std/std.cl"

obj "rr" {}

obj "foo" {
 in {
    a: cell
    b&: cell
 }
 // насчет std.apply - может ему вызываться разрешить однократно? мол если надо неоднократно то вызывайте react?
 std.apply @b @self 2 2
 std.apply @b @self 3 3
}

foo 5 { |x y|
  //output: cell (add @x @y)
  std.print "fun called, x=" @x "y=" @y
}