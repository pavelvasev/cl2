// доп проверка констант

process "alfa" {
  in {
    s: cell
    a: const 0
    b: const 0
  }
  c: cell
  init {:
    self.c.submit( a+b )
  :}
}

sigma : const 33
a: alfa s=1 a=10 b=@sigma

print "hello" @a.c

assert (@a.c == 43)