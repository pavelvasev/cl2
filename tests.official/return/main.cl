func "foo" { x |
  if (@x > 10) {
    return "BIG"
  }
  else {
    return "SMALL"
  }
}

print "started"
y := foo 15
print "y=" @y

assert ((foo 15) == "BIG")
assert ((foo 1) == "SMALL")

// ----------------------------
// возможность ползоваться return если оно заключено в анонимную func

arr := [1,2,3]
q := map @arr (func { x | return (2*@x) })
print "arr=" @arr "q=" @q

///////////////////////////
// автоматический возврат значений последнего элемента для блока
q2 := map @arr { x | 2*@x }
print "arr=" @arr "q2=" @q2