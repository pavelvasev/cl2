coef := 10

r2 := list 1 2 3 | map {: x | return x+1 :} | map { y | return (@y * @coef) }

print "r2 is " @r2

assert (arrays_equal @r2 [20,30,40] )


//let t = [1,2,3]
//print @t

==========
func "compute" { return (list [1] [2] [3,4]) }
//print "compute is" (compute)
// ==========

process "some" {
  in {
    input: cell
  }
  output := @input
}

d := some ( compute | flatten )

print "d is " @d
assert (arrays_equal @d [1,2,3,4])

======
d2 := dict foo=( compute | flatten )
print "d.foo is" (get @d2 "foo")
assert (arrays_equal (get @d2 "foo") [1,2,3,4])