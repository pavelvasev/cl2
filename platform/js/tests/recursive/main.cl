func "fib" { n |
  // print "fib called" @n
  if (@n > 1) {
    //return ((fib (@n - 1) + (fib (@n - 2))))
    // вот это распознается криво.. как 3 несвязанных операции
    // res := fib( @n-1 ) + fib( @n-2 )
    // и вот это тоже
    // res := 10 + (fib (@n-2))
    // а вот это распознается
    res := (fib (@n-1)) + (fib (@n-2))
    // и вот это норм
    //res := plus( fib( @n-1 ), fib( @n-2 ) )
    exit @res
  } else { exit @n }
}

x := fib 10
print "x=" @x

assert (@x == 55)