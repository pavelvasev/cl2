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

// теперь тестируем синтаскис

beta := apply {
  print "hello b1"
  ====
  print "hello b2"
  return 15
  ====
  return 22
}

print "beta=" @beta
