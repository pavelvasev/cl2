# проверяем работу cofunc в синтаксисе {}
# 1 для func 2 инлайн

obj "test1" {
  in {
    a1: cell
  }
  output: cell

  let r := @a1 + 1
  bind @r @output
}

func "foo" { alfa beta |
  t := + "hello from foo " @alfa "~" @beta
  print @t
  return @t
  #print "hello from foo" @alfa @beta
}

print "result is " @res

res := apply { a b|
  c := test1 (@a + 1)
  return (+ @a @b @c)
} 10 20

assert (@res == 42)

#foo 1 2
assert ((foo 1 2) == "hello from foo 1~2")

####################### а теперь похитрее
# проверим что можно указать 2 блока типа {} в качестве позиционных параметров

# f после g
func "combine" { f g |
  return { x |
    return (apply @f (apply @g @x))
  }
}

h := combine { a | return (@a * 3) } { a | return (@a+10) }
x := apply @h 1
print "x=" @x

assert (@x == 33)

#################

/*
func "times" { f n |
  f1 := { x c |
    r := apply @f @x
    cc := if (assigned @c) {return @c} else {return 0}
    return (if (@cc < @n) { return (apply @f1 @r (@cc + 1)) } else { return @r })
  }
  return @f1
}
*/

func "times" { f n |
  return { x |
    // print "range is" (range (@n-1)) "n is" @n "n-1 is" (@n-1)
    return (reduce (range (@n-1)) (apply @f @x) { x acc | return (apply @f @acc) })
  }
}


u := times {: x | return x+x :} 3

y := apply @u "%"
print "y is" @y

assert ((len @y) == 8)

#######################
# тестируем вызов через apply по ссылке

func "foo4" { return 10 }
print "foo4=" (apply @foo4)
assert ((apply @foo4) == 10)