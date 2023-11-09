// именованный сплат подстановка F-NAMED-SPLAT

obj "foo" {
  in {
    a: cell
    b: cell
    c**: cell
  }
  //cvals:= extract @c
  output: cell
  /*
  react (when_all @a @b @cvals) {
    print "a=" @a "b=" @b "cvals=" @cvals
  }
  */
  react (list @a @b @c) {: args |
    console.log('hello',args)
    output.submit( [ args[0],args[1], args[2].d, args[2].e, args[2].hh ] )
  :}
}

d := dict b=11 d=17 a=10 e=44 hh=42
print "d=" @d

f: foo **d

assert (arrays_equal @f.output [10,11,17,44,42])

================

q := list 1 2 3 4 5

print "**q is " **q
