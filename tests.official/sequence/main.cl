// тестируем F-SEQ

alfa := sequence
{
  print "hello block1"
}
{
  print "hi block2"
  return 15
}

print "alfa=" @alfa

assert (@alfa == 15)