// F-DEFAULT-CL

// таки мысли что надо сделать Cl2.create_reaction( comm, code )
obj "react" {
  in {
    input: channel
    action: cell
    children_action&: cell
    // вопрос - а как указать что чилдренов надо компилировать в вычислительном режиме?

  }
  // output: channel
  // нам надо биндится к результатам тасков.. таски выражаются react-ами.. поэтому надо ячейки
  // потому что вот таска сработала, это вызывает другую таску, та создает процесс, а 
  // технология такова что тот процесс начинает зачитывать output-ы вот реакций.. и ничего не прочитает
  // хотя формально если нам надо таски, так и надо делать таски
  //output: cell is_changed={: new old | return true :}
  // теперь можно и канал - т.к. таски сделаны отдельно внешним образом
  // но вообще - в ЛФ вот порт хранит значение.. может и нам хранить? что такого.. (ну gc.. а ну и еще копии промежуточных данных в памяти.. ну посмотрим)
  output: channel

  init "(obj) => {
    //console.channel_verbose('------------- react: ',self+'','listening',input+'')
    let unsub = input.on( (value) => {
      let fn = action.get()      
      //console.log('react input changed. scheduling!',self+'','value=',value)
      CL2.schedule( () => { // принципиальный момент - чтобы реакция не срабатывала посреди другой реакции
        //console.log('react invoking scheduled action.',self+'')
        //console.log('react scheduled call !!!!!!!!!!!!',fn,self+'')
        let result
        if (fn.is_block_function)
          result = fn( self, CL2.create_cell(value) )
        else  
          result = fn( value )
        //console.log('react result=',result+'')

        if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            output.submit( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          output.submit( result )
        }
      })
    })

    self.release.on( () => unsub() )
  }"
}

/* // реакция в стиле ЛФ
obj "react" {
  in {
    input: channel
    action: cell
    children_action&: cell
  }
  input_d: channel
  output: channel

  bind @children_action @action

  init "(obj) => {
    //console.channel_verbose('------------- react: ',self+'','listening',input+'')
    CL2.create_binding_delayed( input, input_d)
    input_d.on( (value) => {
      let fn = action.get()
      let result
      if (fn.is_block_function)
        result = fn( self, CL2.create_cell(value) )
      else  
        result = fn( value )
      output.emit( result )
    })
  }"
}
*/

// в extract складывается массив ячеек, а на выходе он дает массив значений этих ячеек..
obj "extract" {
  in {
    input: cell // можно channel но монитору нужна ячейка
  }
  
  output: cell

    o2: channel
    bind @o2 @output

    init "(obj) => {
  let p = CL2.monitor_rest_values( input, o2 )
  obj.release.on( p )
    }"
}

// ну вроде как нам не надо прямо чтобы вот процесс.. функция тоже норм теперь 
// когда мы из функций процессы делаем
func "print" {: ...vals | console.log(...vals) :}


/*
obj "print" { 
  in {
    rest* : cell
  }

  b: react (extract @rest) {: values | console.log(...values) :}

  // ну типа.. напечатали.. пошлем об этом сообщение.. можно даже значения вернуть если что
  output: channel
  bind @b.output @output

}
*/

// if @cond (block { }) (block { })

obj "else" {
  in {
    value: cell
  }  
}

// if cond then-func [else] else-func
obj "if"
  {
  in {
    condition: cell // если канал то тогда константы не получается подставлять..
    then_branch: cell
    else_branch: cell
    _else~: cell
  }
  output: cell
  current_state: cell 0 // 0 uninited, 1 then case, 2 else case
  current_parent: cell

  //bind @_else.value @else_value  
  // _else является ячейкой, содержащей объект
  // мы в выражениях пока не умеем обратиться к значению этой ячейки, увы
  // да и bind является статической вещью. т.е. это не объект, который отслеживает свои аргументы
  // но он мог бы быть таким, если ввести модификатор для параметра - что надо не связывать,
  // а класть сам синхро-канал в значение
  // но в целом получается что выражение типа cellname.a.b.c является процессом
  // типа geta cellname a b c
  /*
  react @_else { |_else_obj|
    bind @_else_obj.value @else_value
  }
  */

  r_else_obj: react @_else {: val |
    //if (debug)
    //console.log("r1")
    let s1 = val.value.subscribe( (ev) => {
      //console.log("r2",ev)
      else_branch.set( ev )
    })
  :}

  cleanup_current_parent: func {:
    //console.log("cleanup_current_parent",current_parent.get())
      if (current_parent.is_set) {
          let cp = current_parent.get()
          cp.destroy()
          current_parent.set( null )
        }
    :}

  activate_branch: func {: branch_value arg |
      cleanup_current_parent()

      //console.log("activate-branch: ",branch_value)
      let cp = CL2.create_item()
      self.append( cp )
      current_parent.set( cp )

      //let arg_cell = CL2.create_cell( arg )
      //CL2.attach_anonymous( cp, arg_cell )

      let res = branch_value( cp, arg )
      // cp то надо или нет уже
      if (res instanceof CL2.Comm) {
        let b = CL2.create_binding( res, self.output )
        CL2.attach_anonymous( cp, b )
        // по идее при удалении биндинг удалится
      }
  :}

  r_on_then_val: react @then_branch {: value |
    if (current_state.get() == 1) {
      activate_branch( then_branch.get(), condition.get() )
    }
  :}

  r_on_else_val: react @else_branch {: value |
    //console.log("else_value changed:",else_value.get(),"current_state.get()=",current_state.get(),"condition=",condition.get())
    if (current_state.get() == 2) {
      //console.
      activate_branch( else_branch.get(), condition.get() )
    }
  :}

  r_on_cond: react @condition {: value |
    //console.log("if react on condition",value + "",current_state.get(),"self=",self+"")
    //console.trace()
    if (value) {
      if (current_state.get() != 1) {
        //console.log("if activating branch then",value,"then-value=",then_value.get(),"then-block=",then_block.get())
        activate_branch( then_branch.get(), value )
        current_state.set( 1 )
      }
    } else {
      if (current_state.get() != 2) {
        // ну пока так..
        //let els_value = _else.get() ? _else.get().value.get() : else_value.get()
        activate_branch( else_branch.get(), value )
        //activate_branch( else_value.get(), value )
        current_state.set( 2 )
      }
    }
  :}
}

// ну посмотреть на его поведение.. сейчас странная цепочка
// мб вернуться к parent-у и реакцию на parent
obj "return" {
  in {
    value: cell
  }

    // ну тут история что value сразу срабатывает. а может быть имеет смысл delayed сделать..
    // тогда парент-а проверять не придется т.к. он как правило есть
    // но вообще хорошо бы парента просто в обязательные параметры
    react @value {: value |
      // надо добраться до некотого блока возвращающего значения.. и передать его туда
      //let p = self.attached_to
      // спорная реализация.. я тут не проверяю parent на изменение
      // но впрочем как и всю цепочку.. будем посмотреть
      let p = self.parent && self.parent.is_set ? self.parent.get() : self.attached_to
      //console.log('============ return acting',self+"",self)
      //console.log("============ return reacting", p+"")
//      console.trace()
      while (p) {
        //console.log("=========== return checking p=",p+"")
        if (p.output) {
          //console.log("================== return found output", value,p.output + "")
          p.output.set( value )
          return "return_found_output"
        }
        //console.log("it has no ouytput",JSON.stringify(p))
        p = p.parent ? p.parent.get() : p.attached_to
      }
      console.error("return: failed to find output cell!",self+"")
      return "return_not_found_output"
    :}
}

/*
obj "return" {
  in {
    value: cell
  }

  if @self.parent { 
    print "OK RETURN HAVE PARENT"

    // ну тут история что value сразу срабатывает. а может быть имеет смысл delayed сделать..
    // тогда парент-а проверять не придется т.к. он как правило есть
    // но вообще хорошо бы парента просто в обязательные параметры
    react @value {: value |
      // надо добраться до некотого блока возвращающего значения.. и передать его туда
      let p = self.parent.get()
      //console.log("============ return reacting", p+"")
      //console.trace()
      while (p) {
        //console.log("=========== return checking p=",p+"")
        if (p.output) {
          //console.log("================== return found output")
          p.output.set( value )
          return {return_found_output:true}
        }
        p = p.parent.get()
      }
      return {return_found_output:false}
    :}

  } else {
    print "OK RETURN HAVE NO PARENT"
    react @value {: value |
      console.log("============ return reacting, no-parent mode")
    :}
  }
}
*/

// исп: block { some things } -> output_func где output_func функция создания содержимого блока
obj "block" {
  in {
    output&: cell
  }
}

/*
obj "task" {
  in {
    basis_func: cell
    bindings: cell
    consts: cell
  }
  output: cell

  incoming_vals: extract @bindings

  react @incoming_vals.output {: vals |
    // .. merge_vals_to_consts
    let obj = basis_func( consts )
    obj.output.subscribe( (result) => {
      self.output.set( result )
    })
  :}
}
*/

obj "when_all" {
  in {
    rest*: cell
  }
  output: channel
  init {: 
    let unsub = () => {}
    rest.subscribe( (list) => {      
      unsub()
      let q = CL2.when_all( list )
      // вот все-таки порты LF и наши каналы это разное. 
      // ибо порты их держат сооощение 1 такт. и это прикольно.
      // а нас пока спасает что там внутри - delayed стоит.
      let b = CL2.create_binding( q, output )
      unsub = () => { q.destroy(); b.destroy() }
    })
    self.release.subscribe( () => unsub() )
  :}
}

// read нам нужна.. чтобы работало f := 10
func "read" {: x | return x :}

obj "apply" {
  in {
    action: cell
    rest*: cell
  }
  u: extract @rest
  output: cell

  xx: react (when_all @action @u.output) {:
      
      let f = action.get()
      let args = u.output.get()
      //console.log("x-apply",f,args)

      if (f && args) {
        let res = f( ...args )
        //console.log("apply res=",res,"f=",f)
        // типа если вернули канал - то зацепку за его значение нам обеспечит react
        return res
        /*
        
        //if (f.awaitable) res.then(val => output.set( val ))
        // console.log("CCC f.is_task_function=",f.is_task_function,"f=",f)
        if (f.is_task_function && res instanceof CL2.Comm) {
          console.log("task fn!",res + "")
          // вернули канал? слушаем его дальше..
          let unsub = res.once( (val) => {
            console.log("once",val)
            output.set( val )
          })
        }
        else
          output.set( res )
        */  

      } 
    :}

  bind @xx.output @output
}

//// арифметика

func "plus" {: ...values |    
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum + values[i]      
  return sum
:}

alias "plus" "+"

func "minus" {: ...values |  
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum - values[i]      
  return sum
:}

alias "minus" "-"

func "mul" {: ...values |  
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum * values[i]      
  return sum
:}

alias "mul" "*"

func "div" {: ...values |  
  let sum = values[0]
  for (let i=1; i<values.length; i++)
      sum = sum / values[i]      
  return sum
:}

alias "div" "/"

// ----------------------- логика

func "and" {: ...values |   
   for (let i=0; i<values.length; i++)
     if (!(values[i])) return false
   return true
:}
alias "and" "&&"

// нестандартное поведение.. мб для про-режима сойдет, но не для таск-режима..
func "or" {: ...values |   
   for (let i=0; i<values.length; i++)
     if (values[i]) return true
   return false
:}
alias "or" "||"

///////////////////////

func "equal" {: ...values |
   // какое надо equals? строгое или нестрогое?
   // сделал пока строгое
   for (let i=1; i<values.length; i++)
     if (!(values[i] === values[i-1])) return false
   return true  
:}
alias "equal" "=="

func "less" {: ...values |
   // какое надо equals? строгое или нестрогое?
   // сделал пока строгое
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] < values[i])) return false
   return true
:}
alias "less" "<"

func "less_equal" {: ...values |
   // какое надо equals? строгое или нестрогое?
   // сделал пока строгое
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] <= values[i])) return false
   return true
:}
alias "less_equal" "<="

func "more" {: ...values |
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] >= values[i])) return false
   return true
:}
alias "more" ">"

func "more_equal" {: ...values |
   for (let i=1; i<values.length; i++)
     if (!(values[i-1] >= values[i])) return false
   return true
:}
alias "more_equal" ">="


// -----------------------
// F-LIST-COMM преобразование списков в события и обратно

// submit_events @list -> channel записывает все элементы списка в канал
obj "submit_events" {
  in {
    input: cell
  }
  output: channel
  react @input {: arr |
    arr.map( v => output.submit( v ) )
  :}
}

// gather_events @channel -> list - собирает события из канала в список
obj "gather_events" {
  in {
    input: channel
  }
  output: cell []
  react @input {: val |
    let arr = output.get();
    arr.push( val ); 
    output.set( arr.slice(0) ) 
    // slice(0) конечно это ваще.. но иначе change-проверка не поймет смены..
    // а даже если здесь поймет то дальше не поймет.. это надо как-то особо обработать..
    // мб идея - поле для массива с его версией.
  :}
  // тут кстати та же проблема - массив то тот же самый, и события changed не будет
}

// reduce_events @channel acc_init func -> acc
// собирает значения из канала и применяет к ним функцию func(channel_val, acc).
// но вообще странно, надо ли это.. это же типа как реакция в целом то получается,
// просто особой формы.. да и просто reduce нам тоже надо..
obj "reduce_events" {
  in {
    input: channel
    init: cell
    f: cell
  }
  // надо init сделать промисой. тогда все ок будет. или параметром даже лучше. и f параметром. т.е. требовать наличия.
  // это кстати будет норм, т.к. в таск-режиме это обернется в промису
  acc: cell
  bind @init @acc

  output: cell
  bind @acc @output

  react @input {: value |
    let new_acc = f.get().call( this, value, acc.get() )
    // привет, тут промиса будет от кофункций. и что делать?
    if (new_acc instanceof CL2.Comm) {
      new_acc.once( val => {
        acc.set( new_acc )
        // надо какой-то режим буферизации.. чтобы может быть react функцию просто не вызывал
        // пока мы тут не закончим.. а буферизировал скажем.. todo
      })
    }
    else
      acc.set( new_acc )
  :}
}

////////////////////////////////
// идея - как-то автоматом передавать locinfo в assert..
// идея - дампить доп объекты
// перенесено в формы, чтобы locinfo по умолчанию в message выводить..
/*
func "assert1" {: cond message |
  message ||= ''
  if (!cond) {
    console.error( 'assert FAILED',message )
    throw message
  }
  console.log("assert OK",message )
:}
*/

// todo вынести в assert.cl и научиться ре-экспортировать имена
// а также там-же ввести форму для assert (вынести из forms.js в cl-язык)
func "arrays_equal" {: a b |
  if (Array.isArray(a) && Array.isArray(b) && a.length == b.length) {
    for (let i=0; i<a.length; i++)
      if (a[i] != b[i]) return false
    return true
  }
  return false
:}


///////////////////////

func "list" {: ...values | return values :}

func "get" {: src field | return src[field] :}

func "map" {: arr f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e) {
    return new Promise( (resolve,reject) => {
    let result = f( e )
    if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0 ) {
    if (i >= arr.length) return Promise.resolve([])

    return process_elem( arr[i] ).then( (result) => {
      return process_arr( arr,i+1 ).then( (rest_result) => {
        return [result,...rest_result]
      })      
    })
  }

  let output = CL2.create_cell()
  process_arr( arr ).then( values => output.submit( values ))
  return output
:}

func "filter" {: arr f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e) {
    return new Promise( (resolve,reject) => {
    let result = f( e )
    if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0 ) {
    if (i >= arr.length) return Promise.resolve([])

    return process_elem( arr[i] ).then( (result) => {
      return process_arr( arr,i+1 ).then( (rest_result) => {
        if (result)
          return [arr[i], ...rest_result]
        return rest_result
      })      
    })
  }

  let output = CL2.create_cell()
  process_arr( arr ).then( values => output.submit( values ))
  return output
:}

func "reduce" {: arr acc_init f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,acc) {
    return new Promise( (resolve,reject) => {

    let result = f( e, acc )
    if (result instanceof CL2.Comm) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0,acc ) {
    if (i >= arr.length) return Promise.resolve(acc)

    return process_elem( arr[i],acc ).then( (result) => {
      return process_arr( arr,i+1,result )
    })
  }

  let output = CL2.create_cell()
  process_arr( arr,0,acc_init ).then( values => output.submit( values ))
  return output
:}

// ну пока такое
func "range" {: max |
  let arr = new Array(max)
  for (let i=0; i<max; i++) arr[i] = i
  return arr
:}

func "len" {: obj |
    return obj.length
:}

// получается это мы делаем динамический пайп, в него можно будет в рантайме добавлять объекты
// но в целом это так-то очень редко надо.. плюс проблема - обработка input-позиционных аргументов..
/*
obj "dynamic_pipe" {
  in {
    input: cell
  }
  rebuild: channel
  subscriptions: cell []
  output: cell

  func "clear_subscriptions" {:
    subscriptions.get().map( x => x.destroy() )
    subscriptions.set( [] )
  :}

  // bind @self.release @clear_subscriptions

  init {:
    CL2.create_binding_delayed( self.children.changed, self.rebuild)
    self.release.subscribe( clear_subscriptions )

    self.rebuild.subscribe( () => {
      //console.log('bbb', self.children.get())
      console.log('bbb', [...self.children.get().values()].map( x => x+''))

      clear_subscriptions()

      for (let i=0;)
    })
  
}
*/