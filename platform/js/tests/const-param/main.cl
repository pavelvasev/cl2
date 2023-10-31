// тест фичи F-CONST-PARAM

obj "foo1" {
  in {
    beta: const
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
  bebe: foo1 @alfa
  
  output := @bebe.beta
}

sigma: const 20
//sigma := 5

f: foo @sigma

f1: foo1
print "f1.beta = " @f1.beta

//foo 15

print "intern" (apply {: return f.alfa :})
print "intern2" @f.alfa
print "intern3" @f.output

assert (@f.alfa == @sigma)
assert (@f.output == @sigma)
