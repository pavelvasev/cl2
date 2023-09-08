# проверяем работу cofunc в синтаксисе {{ }}
# 1 для func 2 инлайн

obj "test1" {
  in {
    a1: cell
  }
  output: cell

  let r := @a1 + 1
  bind @r @output
}

func "foo" {{ alfa beta |
  t := + "hello from foo " @alfa "~" @beta
  print @t
  return @t
  #print "hello from foo" @alfa @beta
}}

print "result is " @res

res := apply {{ a b|
  c := test1 (@a + 1)
  return (+ @a @b @c)
}} 10 20

assert (@res == 42)

#foo 1 2
assert ((foo 1 2) == "hello from foo 1~2")