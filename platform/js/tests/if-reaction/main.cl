// проверяем как себя ведет if внутри react
// а то были случаи что зависало.

a: channel

b:= react @a { val |
  print "react start! val=" @val
  return (if (@val > 10) {
    return 1
  } else { return 2 })
}

print "b=" @b
apply {: a.submit(15); a.submit( 5 ); :}

l := gather_events @b

import std="std"
react (std.timer period=50 n=1) {
  print "enter 3"
  print "l=" @l
  assert (arrays_equal @l [1,2])
}
