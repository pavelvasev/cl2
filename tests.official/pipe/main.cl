coef := 10

r2 := list 1 2 3 | map {: x | return x+1 :} | map {{ y | return (@y * @coef) }}

print "r2 is " @r2

assert (arrays_equal @r2 [20,30,40] )


//let t = [1,2,3]
//print @t