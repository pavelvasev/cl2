// умееем присвоить константну
print "stage 1"

k := 10
// умеем присвоить функцию
f := { x  | return (@x * @k) }

// map работает используя ссылку на функцию
r1 := map [1,2,3] @f

print "r1 is" @r1

assert (arrays_equal @r1 [10,20,30])

func "test1" {
  print "exported"
}


# тестируем фичу отлова вычитания F-OPERATOR-MINUS
========================
print "stage 2"
n := 10
m := @n-1

print "m = " @m

assert (@m == 9)

# тестируем что можем использовать apply, чтобы не было конфликтов по именам
========================
print "stage 3"
apply {
  n := 11
  print "inside apply, n=" @n
  assert (@n == 11)
  ====
  return 1
}

# тестируем if
========================
print "stage 4"
func "igra" { d |
    // тут мы заодно тестируем оператор >=
    if (@d >= 10) { "vasya" } else { "petya" }
} // todo внутри apply чето не работает
apply {

  d := 10

  t := igra 15
  print "pobeditel: " @t
  assert (@t == "vasya")
  t2 := igra 5
  print "pobeditel2: " @t2
  assert (@t2 == "petya")
  ====
  return 1
}

## в форме k := if .. else ...
========================
print "stage 5"
apply {
  k := if (10 > 100) true else false
  assert (@k == false)
  =====
  return 1
}

# в форме k := foo | alfa
========================
print "stage 6"
apply {
  k_pipe := apply {: return 10 :} | react {: val | return val+12 :}
  print "k_pipe=" @k_pipe
  assert (@k_pipe == 22)
  ==== return 1
}



=======================
# операции сравнения
print "stage 7"
assert (10 > 0)
assert (10 >= 10)
assert (10 < 20)
assert (10 <= 10)
assert (not (10 < 9))
assert (not (10 <= 9))

=======================
print "all finished!"