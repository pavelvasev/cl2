// умееем присвоить константну

k := 10
// умеем присвоить функцию
f := { x  | return (@x * @k) }

// map работает используя ссылку на функцию
r1 := map [1,2,3] @f

print "r1 is" @r1

assert (arrays_equal @r1 [10,20,30])


# тестируем фичу отлова вычитания F-OPERATOR-MINUS

n := 10
m := @n-1

print "m = " @m

assert (@m == 9)

# тестируем что можем использовать apply, чтобы не было конфликтов по именам
apply {
  n := 11
  print "inside apply, n=" @n
  assert (@n == 11)
}

# тестируем if
func "igra" { d |
    if (@d > 10) { "vasya" } else { "petya" }
} // todo внутри apply чето не работает
apply {

  d := 10

  t := igra 15
  print "pobeditel: " @t
  assert (@t == "vasya")
  t2 := igra 5
  print "pobeditel2: " @t2
  assert (@t2 == "petya")

}

## в форме k := if .. else ...
apply {
  k := if (10 > 100) true else false
  assert (@k == false)
}
# в форме k := foo | alfa
apply {
  k_pipe := apply {: return 10 :} | react {: val | return val+12 :}
  print "k_pipe=" @k_pipe
  assert (@k_pipe == 22)
}
