// моделируем if

transform "iff" {: i objs state|
  //let obj = objs[i]
  //let res = state.tool.parse( "print 333" )
  //objs.splice(i,1,...res)

  let obj = objs[i]
  obj.basis = "if"
  obj.basis_path = [ "if" ]
  // переделали в if

  let next_obj = objs[i + 1]
  //console.log("NX=",next_obj )
  if (next_obj.basis == "else")
  {
    obj.params.else_branch = next_obj.params[0]
    // todo так-то надо и подвыражения переносить
    // но в будущем я надесюь что они будут упакованы в значение параметра.
    
    // удаляем етот else
    objs.splice( i+1, 1 )
  }
  
  //console.log("transform iff helo returning slice!",objs.length,s.length,s);
  return [i,objs]
:}

print 1
a:=(iff true 15 else 20)
b:=(iff false 15 else 20)
print "if result is" @a
print "if2 result is" @b

=====
print 2

assert (@a == 15)
assert (@b == 20)
