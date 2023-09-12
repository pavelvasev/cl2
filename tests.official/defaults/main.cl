# тестируем операторы из default.cl

a := reduce [5,7,5] 0 {: x acc | return x+acc :}
print "a=" @a

assert (@a == 17)

b := range(10)
print "b=" @b
assert (arrays_equal @b [0,1,2,3,4,5,6,7,8,9])

######################

s := "1234567"
assert ((len @s) == 7)

s2 := [1,2,3]
assert ((len @s2) == 3)