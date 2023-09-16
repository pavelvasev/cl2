a := 5
b := 10

c := react @a {
  return (react @b {
    return @b
  })
}

print "c=" @c

assert (@c == 10)