# тестируем новый синтаксис вида name(arg,arg,foo=arg)

import os="std/os.cl"

///////////////// возможность использовать пайпу в аргументах

func "foo0" { coef x | return (@coef*@x) }

r44 := foo0( 2, foo0(2,10) | foo0 5 )
print "r44=" @r44
assert (@r44 == 200) // 2 * (2*10)*5

///////////////// случай or

//init_dir := or (get (os.env) "DIR") (567 + 1)
#k1:= get(os.env(),"DIR1")
#init_dir := or (get(os.env(),"DIR")) (567 + 1)
init_dir := or (get(os.env(),"DIR123")) "567"
print "init_dir=" @init_dir
assert( @init_dir == "567" )

///////////////// вызов функции по-новому

func "foo" { x | return (2*@x) }
foo(4, os.cwd("alfa"))

///////////////// map работает в форме map(arr) {}

arr2:=[1,2,3]
r2:= map(@arr2) { x | print "map x=" @x return @x}
print "r2=" @r2
assert (arrays_equal @r2 [1,2,3])

// умеем вычислять выражение

func "add1" {: x | return x+1 :}

kk := add1( add1( add1(1) + add1(2) ) )
print "kk=" @kk "should be 7"
assert (@kk == 7)


// ====================================================

// умееем присвоить константну

k := 10
// умеем присвоить функцию
f := { x  | return (@x * @k) }

// map работает используя ссылку на функцию
r1 := map( [1,2,3],@f )

print("r1 is",@r1)

assert(arrays_equal(@r1,[10,20,30]))



// ====================================================
# тестируем фичу отлова вычитания F-OPERATOR-MINUS

n := 10
m := @n-1

print("m=",@m)

assert (@m == 9)

# тестируем что можем использовать apply, чтобы не было конфликтов по именам
apply {
  n := 11
  print "inside apply, n=" @n
  assert (@n == 11)
}

# тестируем if
func "igra" { d |
    return (if (@d > 10) { return "vasya" } else { return "petya" })
} // todo внутри apply чето не работает
apply {

  d := 10

  t := igra(15)
  print "pobeditel: " @t
  assert (@t == "vasya")
  t2 := igra(5)
  print "pobeditel2: " @t2
  assert (@t2 == "petya")

}

## в форме k := if .. else ...
apply {
  k := if (10 > 100) { return true } else { return false }
  assert (@k == false)
}
# в форме k := foo | alfa
apply {
  k_pipe := apply({: return 10 :}) | react({: val | return val+12 :})
  print "k_pipe=" @k_pipe
  assert (@k_pipe == 22)
}
*/