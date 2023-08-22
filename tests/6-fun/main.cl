import std="std/std.cl"

fun "foo" {
  in { a: cell b: cell }
  output: cell
  
  // todo reaction @a @b "(a,b) => a*b"

  //return @a
  bind @a @output
}

let r = (foo 3 4)
std.print @r