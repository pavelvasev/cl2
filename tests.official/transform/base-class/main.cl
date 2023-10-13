transform "base_class" {: i objs state C|

  let obj = objs[i]
  let next_objs = C.objs2objs( objs.slice(i+1), state )
  let next_obj = next_objs[0] //objs[i+1]

  next_obj.params.base_code = `create_${obj.params[0]}({})`

  return objs.slice( 0,i ).concat( next_objs )
:}


obj "foo1" {

  alfa: cell 5

  init {:
    console.log("foo1 created")
  :}
}

base_class "foo1"
obj "foo2" {
  init {:
    console.log("foo2 created")
    self.alfa.submit( 10 )
  :}
}
//base_code="create_foo1({})" {

f: foo2
print "f.alfa=" @f.alfa

=============
print "so"

assert (@f.alfa == 10)