// тест фичи F-CONST-PARAM

obj "foo1" {
  in {
    beta: const
    tetra: cell
  }
  init {:
    console.log("beta is",beta);
  :}
}

obj "foo" {
  in {
    alfa: const 10
  }

  init {:
    console.log("alfa is",alfa);
  :}

  //bebe: foo1 (% + 10 @alfa)
  bebe: foo1 @alfa 14
  
  output := @bebe.beta
}

sigma: const 20
//sigma := 5

f: foo @sigma
assert (@f.alfa == @sigma)

====

f1: foo1 11 14
print "f1.beta = " @f1.beta

//foo 15

print "intern" (apply {: return f.alfa :})
print "intern2" @f.alfa
print "intern3" @f.output

assert (@f.output == @sigma)
