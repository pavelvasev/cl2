a := 5
b := 10

c := apply { val |
  return (apply { v1 v2 |
    return (+ @v1 @v2)
  } @val @b)
} @a

print "c=" @c

assert (@c == 15)