# проверяем работу map в режиме функций и ко-функций

k := list 1 2 3
result1 := map @k {: val | return val * val :}
print "result = " @result1
func "assert_arr" { |result|
  assert ((get @result 0) == 1)
  assert ((get @result 1) == 4)
  assert ((get @result 2) == 9) "9 is ok"
  return true
}
assert_arr @result1

// enter @state_2
// ====== state_2

result2 := map @k { |val| return (@val * @val) }
print "result2 = " @result2

assert (assert_arr @result2)