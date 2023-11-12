/* F-STATIC-LATER
   тестируем возможность ссылаться на статическое имя, которое становится статическим после ссылки на него
*/

process "alfa" {
  in {
    p_beta: cell
  }
  print "hello from alfa, beta.coef is" @output
  
  output := get @p_beta "coef" | read_value
}

process "beta" {
  in {
    p_alfa: cell
    coef: cell 10
  }
  output := * (get @p_alfa "output" | read_value) 2
  
  print "hello from beta, output=" @output
}

a: alfa p_beta=@b
b: beta p_alfa=@a coef=12

assert (@a.output == 12)
assert (@b.output == 24)