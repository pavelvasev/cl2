// тестируем F-SEQ
/*
alfa := sequence
{
  print "hello block1"
}
{
  print "hi block2"
  return 15
}
{
  return 22
}

print "alfa=" @alfa

assert (@alfa == 15)
*/

// теперь тестируем wait и синтаскис ====
// F-SEQ-WAIT

beta := apply {
  print "hello b1"
  ==============
  print "hello b2"
  return 15
  ==============
  print "should not reach"
  return 22
}

print "beta=" @beta

assert (@beta == 15)