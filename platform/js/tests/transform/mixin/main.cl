transform "foo_master" {: i objs state C|
  let me = state.tool.parse( "mixin 'foo2'" ) [0]

  let obj = objs[i]
  if (obj.params[1]) {
    me.params[ me.positional_params_count ] = obj.params[1]
    me.positional_params_count++
  }

  objs.splice( i,1,me )
  return [i,objs]
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

// но так же не будешь каждый раз делать

// ну это напрашивается.. просто подстановку делать да и все.. 
// можно даже с детьми кстати - последнему детей выставлять
/*
transform "foo_master2" {
  mixin "foo"
}
*/

// но было бы гораздо круче - просто функцию генератор.. которая честно отработает на этапе компиляции..
// а такую можно сделать через типа compiler_eval или типа того - внедрить просто функцию в компилятор
// типа state.prepend_mixin = function(...) { .... }

// итого вот 2 варианта. 
// 1) simple_transform name { mixin "foo" some_other_tr 1 2 3 } типа это приписка-замена name, 
// 2) регать свои функции и вызывать их
// ну и можно будет в теории transform { i objs state C | return (some_patch...) } но это уж на потом.. 

transform "mixin" {: i objs state C|

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

obj "foo0" {
  init {:
    console.log("foo0 created")
  :}
}


obj "foo1" {
  alfa: cell 5
  init {:
    console.log("foo1 created")
  :}
}

mixin "foo0" "foo1" {
  obj "foo2" {
    init {:
      console.log("foo2 created")
      self.alfa.submit( 10 )
    :}
  }
}

// ну это напрашивается.. просто подстановку делать да и все.. 
// можно даже с детьми кстати - последнему детей выставлять

obj "extra1" {
  init {: console.log("hello from extra") :}
}

simple_transform "foo_master2"
{
  mixin "foo2"
  mixin "extra1"
}

//mixin "foo2"
//foo_master
foo_master2 {
  obj "foo3" {
    init {: console.log("foo3 created") :}
  }
}
//base_code="create_foo1({})" {

f: foo3
print "f.alfa=" @f.alfa

=============
print "so"

assert (@f.alfa == 10)