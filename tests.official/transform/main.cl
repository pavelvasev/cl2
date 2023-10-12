transform "iff" {: i objs state|
  //let obj = objs[i]
  let res = state.tool.parse( "print 333" )
  //console.log("333",state.tool)
  //console.log("iff res=",res)
  objs.splice(i,1,...res)
  //console.log("transform iff helo returning slice!",objs.length,s.length,s);
  return objs
:}

print 1
iff true 15 else 20
print 2