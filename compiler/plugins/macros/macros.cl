macro "mixin" {: i objs state C|

  let obj = objs[i]
  
  let params_count = obj.positional_params_count
  let last_param = obj.params[ params_count-1 ]
  //console.log("lp=",last_param)
  let target_objs  
  
  if (last_param.code) {
    target_objs = C.objs2objs( last_param.code, state )
    objs.splice( i,1,...target_objs ) // заменим себя на {}-содержимое, а остальных оставим
    params_count--
  } else {
    let next_objs = C.objs2objs( objs.slice(i+1), state )
    let next_obj = next_objs[0] //objs[i+1]
    target_objs = [next_obj]
    // выкусим себя и разместим подстановку
    objs = objs.slice( 0,i ).concat( next_objs )
    
  }

  //next_obj.params.base_code = `create_${obj.params[0]}({})`

  function setup_mixin( mx_name, target_obj ) 
  {
    //console.log("target_obj=",target_obj)
    //let mx_name = obj.params[0]
    let code = `create_${mx_name}({base_obj:self})`
    let gen = state.tool.parse( `paste "${code}"` ) // todo optimize
    let next_obj_code = target_obj.params[1].code
    //console.log("next_obj=",next_obj)
    next_obj_code.unshift( ...gen )
  }

  //console.log(obj)
  // F-MIXIN-MULTI
  for (let i=params_count-1; i>=0; i--)
    for (let next_obj of target_objs)
      setup_mixin( obj.params[i], next_obj )

  //console.log( next_obj_code )
  //console.log( "NNNNN=",next_objs[0].params[1])

  //let res = objs.slice( 0,i ).concat( next_objs )
  //console.log(res)
  //return res
  return [i,objs]
:}