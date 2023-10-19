// return внутри if влияет на функцию а не на if

func "foo" { x |
  if (@x > 10) {
    exit "BIG"
  }
  else {
    exit "SMALL"
  }
  let k := 22
}

print "started"
y := foo 15
print "y=" @y

assert ((foo 15) == "BIG")
assert ((foo 1) == "SMALL")

///////////////////////////
// возможность ползоваться return и в инлайн-функциях
arr := [1,2,3]
q := map @arr { x | return (2*@x) }
print "arr=" @arr "q=" @q

///////////////////////////
// автоматический возврат значений последнего элемента для блока F-RETVAL-LAST. update - если единственный
q2 := map @arr { x | 2*@x }
print "arr=" @arr "q2(implicit return)=" @q2

//////////////////////////

func "foo2" { x |
  if (@x > 10) {
    "BIG"
  }
  else {
    "SMALL"
  }
}

print "foo2(15)=" (foo2 15)
map (range(20)) { x |
  print "x=" @x "foo(x)=" (foo @x) "foo2(x)=" (foo2 @x)
  return (assert ((foo @x) == (foo2 @x))) 
  // иде ина будущее {= + "x=" @x }
  //(+ "x=" @x)
}