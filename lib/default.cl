// F-DEFAULT-CL

// таки мысли что надо сделать Cl2.create_reaction( comm, code )
obj "react" {
  in {
    input: channel
    action: cell
    children_action&: cell
    // вопрос - а как указать что чилдренов надо компилировать в вычислительном режиме?

  }
  //output: channel
  // нам надо биндится к результатам тасков.. таски выражаются react-ами.. поэтому надо ячейки
  output: cell is_changed={: new old | return true :}

  init "(obj) => {
    //console.channel_verbose('------------- react: ',self+'','listening',input+'')
    input.on( (value) => {
      let fn = action.get()      
      //console.log('react input changed. scheduling!',self+'','value=',value)
      CL2.schedule( () => { // принципиальный момент - чтобы реакция не срабатывала посреди другой реакции
        //console.log('react invoking scheduled action.',self+'')
        //console.log('react scheduled call !!!!!!!!!!!!')
        let result
        if (fn.is_block_function)
          result = fn( self, CL2.create_cell(value) )
        else  
          result = fn( value )

        if (result instanceof CL2.Comm) {
          // вернули канал? слушаем его дальше.. такое правило для реакций
          let unsub = result.once( (val) => {
            output.submit( val )  
          })
        }
        else
          output.submit( result )
      })
    })
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

obj "print" { 
  in {
    rest* : cell
  }

  x: func {: values | console.log(...values) :}
  print_vals: extract @rest
  react @print_vals.output @x

  /*
  reaction (extract @rest) {: values |
    console.log(values)
  :}*/

}

// if @cond (block { }) (block { })

obj "else" {
  in {
    value: cell
    else_block&:cell
  }
  bind @else_block @value
}

obj "if"
  {
  in {
    condition: cell // если канал то тогда константы не получается подставлять..
    then_value: cell
    else_value: cell

    then_block&: cell

    _else~: cell

    //debuglog: cell {: :}
    debug: cell false
  }
  output: cell
  current_state: cell 0 // 0 uninited, 1 then case, 2 else case
  current_parent: cell

  // режим if @cond {}
  bind @then_block @then_value

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

  react @_else {: val |
    //if (debug)
    //console.log("r1")
    let s1 = val.value.subscribe( (ev) => {
      //console.log("r2",ev)
      else_value.set( ev )
    })
  :}

  cleanup_current_parent: func {:
    //console.log("cleanup_current_parent",current_parent.get())
        if (current_parent.get()) {
          let cp = current_parent.get()
          cp.destroy()
          current_parent.set( null )
        }
    :}

  activate_branch: func {: branch_value arg |
        cleanup_current_parent()

        //console.log("activate-branch: ",branch_value)

        if (branch_value?.is_block_function) {
          //console.log("activate-branch: is-block-function",branch_value)
          let cp = CL2.create_item()
          self.append( cp )
          current_parent.set( cp )

          let arg_cell = CL2.create_cell( arg )
          CL2.attach_anonymous( cp, arg_cell )

          let res = branch_value( cp, arg_cell )
          //output.set( res )
          // ну вроде как там теперь return должен срабатывать
          // т.е это забота ветки - находить output
        } else {
          //console.log("activate-branch: not block-function",branch_value)
          output.set( branch_value )
        }
  :}

  react @then_value {: value |
    if (current_state.get() == 1) {
      activate_branch( then_value.get(), condition.get() )
    }
  :}

  react @else_value {: value |
    //console.log("else_value changed:",else_value.get(),"current_state.get()=",current_state.get(),"condition=",condition.get())
    if (current_state.get() == 2) {
      //console.
      activate_branch( else_value.get(), condition.get() )
    }
  :}

  react @condition {: value |
    //console.log("if react on condition",value + "",current_state.get(),"self=",self+"")
    //console.trace()
    if (value) {
      if (current_state.get() != 1) {
        //console.log("if activating branch then",value,"then-value=",then_value.get(),"then-block=",then_block.get())
        activate_branch( then_value.get(), value )
        current_state.set( 1 )
      }
    } else {
      if (current_state.get() != 2) {
        // ну пока так..
        //let els_value = _else.get() ? _else.get().value.get() : else_value.get()
        activate_branch( else_value.get(), value )
        //activate_branch( else_value.get(), value )
        current_state.set( 2 )
      }
    }
  :}
}

obj "return" {
  in {
    value: cell
  }

  if @self.parent { 
    //print "OK RETURN HAVE PARENT"

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
          return
        }
        p = p.parent.get()
      }
    :}

  } else {
    print "OK RETURN HAVE NO PARENT"
    react @value {: value |
      console.log("============ return reacting, no-parent mode")
    :}    
  }
}

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

obj "apply" {
  in {
    action: cell
    rest*: cell
  }
  u: extract @rest
  output: cell

    x: func {:
      
      let f = action.get()
      let args = u.output.get()
      //console.log("x-apply",f,args)
//      console.trace()
//      console.log("qq: x",f,args)

      if (f && args) {
//        console.log("calling")
        let res = f( ...args )
        //console.log("res=",res)
        //if (f.awaitable) res.then(val => output.set( val ))
        if (f.is_task_function && res instanceof CL2.Comm) {
          //console.log("branch!",res + "")
          // вернули канал? слушаем его дальше..
          let unsub = res.once( (val) => {
            console.log("once",val)
            output.set( val )
          })
        }
        else
          output.set( res )

      } else {

      }
    :}

  xx: react (when_all @action @u.output) @x

  //bind @xx @output
}