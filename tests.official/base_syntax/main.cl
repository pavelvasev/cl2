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

print @m

assert (@m == 9)

# тестируем что можем использовать apply, чтобы не было конфликтов по именам
apply {
  n := 11
  print "inside apply, n=" @n
  assert (@n == 11)
}
