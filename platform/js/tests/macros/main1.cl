modifier "some" {: obj target state |
  //console.log( "called modifier some!",target )
  let prefix = obj.params[0] || "my input is"
  console.log( "oooo",obj.params )
  let gen = state.tool.parse( `print "${prefix}" @input` ) // todo optimize
  let next_obj_code = target.params[1].code
  //console.log("next_obj=",next_obj)
  next_obj_code.unshift( ...gen )
  
  return target;
:}

%some "hello" {
%some {
process "alfa" {
  in {
    input: cell
}
}
}
}

alfa 5
