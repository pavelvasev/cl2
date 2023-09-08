obj "test1" {
  in {
    a1: cell
  }
  output: cell

  let r := @a1 + 1
  bind @r @output
}

print "result is " @res

res := apply (cofunc { |a b|
  c := test1 (@a + 1)
  return (+ @a @b @c)
}) 10 20

assert (@res == 42)

