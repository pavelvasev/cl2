// тут трансформации языка, включенные по умолчанию. 

// paste_file f1 f2 f3
/*
transform "paste_file" {: i objs state C|
  let obj = objs[i]  
} 
*/ 

// миксины
/*
  варианты:
    1 - mixin "name" "name" obj "target" { }
    2 - mixin "name" "name" { obj ... obj .. }
*/

// paste_file "mixins.cl"
// это как бы здорово но.. хотелось бы более большие куски добавлять рандомные
// не совместимые с синтаксисом.. но это значит что надо на уровне парсера
// это уметь делать.. хнык
// ну ладно, хотя бы просто.

// [[= целевой язык ]]
// [[=! paste_file "mixins.cl" ]]

transform "mixin" {: i objs state C|

  let obj = objs[i]
  
  let params_count = obj.positional_params_count
  let last_param = obj.params[ params_count-1 ]
  //console.log("lp=",last_param)
  let target_objs

  if (last_param.code) {
    //if (params_count > 1) {
      target_objs = C.objs2objs( last_param.code, state )
      objs.splice( i,1,...target_objs ) // заменим себя на {}-содержимое, а остальных оставим
      params_count--
      /*
    } else {
      // вариант 3
      
      //let mod_state = C.modify_parent( state,null,null )
      target_objs = C.objs2objs( last_param.code, state )
      //console.log(target_objs)
      objs.splice( i,1,...target_objs ) // заменим себя на {}-содержимое, а остальных оставим      
      for (let k of target_objs) {
        k.base_obj = {link: true, from:"self"}
        k.skip_attach = true
      }
      return [i,objs]
      
    }
    */
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

// новые миксины
// imixin { spec spec.... }
// imixin { spec spec... } @target1
//  цель ток одна потому что иначе много объектов придется создавать а не хотелось бы пока
//  т.к это вообще экспериментальный вариант
// да и вообще вот такой динамический миксин несколько плох тем что он
// не дает возможности сделать проверку параметров (ссылок) на этапе компиляции а другие варианты дают
transform "imixin" {: i objs state C|

  let obj = objs[i]
  
  let params_count = obj.positional_params_count
  let last_param = obj.params[ 0 ]
  //console.log("lp=",last_param)
  let mixin_codes = last_param.code
  //console.log(obj.params)
  let target_objs = C.objs2objs( mixin_codes, state )

  let target 
  if (params_count == 1) { // кому.. пока одному...
    target = {link: true, from:"self"}
  } else {
    //for (let i=0; i<params_count-1; i++)
    //  targets.push( obj.params[i] )
    target = obj.params[1]
  }

  objs.splice( i,1,...target_objs ) // заменим себя на {}-содержимое, а остальных оставим      

  for (let k of target_objs) {
    k.base_obj = target
    k.skip_attach = true
  }

  return [i,objs]

:}  

/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

// трансформация "наследование"
// base_class "some" obj "other" { .... }

transform "base_class" {: i objs state C|

  let obj = objs[i]
  let next_objs = C.objs2objs( objs.slice(i+1), state )
  let next_obj = next_objs[0] //objs[i+1]

  next_obj.params.base_code = `create_${obj.params[0]}({})`

  return [i, objs.slice( 0,i ).concat( next_objs )]
:}


// создание трансформаций путем приписывания
/* пример:
   simple_transform "a_tree_lift" {
     mixin "tree_lift"
   }
   алгоритм:
   
   simple_transform T { commands }
   
   T obj
   
   записать вместо T указанные команды commands
   при этом если у T есть аргументы - то подставить их последней из commands
*/
transform "simple_transform" {: i objs state C|

 let obj = objs[i]
 let commands = obj.params[1].code
 let name = obj.params[0]

 // создаем новую трансформацию
 state.current[ name ] = {
  basis: name,
  transform: (a_i,a_objs,a_state,a_C) => {
   let a_obj = a_objs[ a_i ]
   let new_commands = [...commands]
   //console.log("qqq",a_obj.params[0])
   let a_subcode = a_obj.params[0]
   
   if (a_subcode) { // вариант T {}
     let last_new_command = new_commands[ new_commands.length-1 ]
     last_new_command = {...last_new_command} // сделаем копию
     last_new_command.params[ last_new_command.positional_params_count ] = a_subcode // подстановка кода
     last_new_command.positional_params_count++
     new_commands = new_commands.slice( 0, new_commands.length-1 ).concat( [last_new_command] )
     //console.log("GGG=",new_commands )
     a_objs.splice( i,1,...new_commands )
   }
   else // вариант T obj
     a_objs.splice( i,1,...new_commands )
   return [i,a_objs]
  }
  }
  objs.splice( i,1 )
  return [i,objs]
:}