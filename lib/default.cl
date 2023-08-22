// F-DEFAULT-CL

obj "react" {
  in {
    input: channel
    action: cell
    children_action&: cell
  }
  output: channel

  init "(obj) => {
    //console.channel_verbose('------------- react: ',self+'','listening',input+'')
    input.on( (value) => {
      let fn = action.get()      
      CL2.schedule( () => {
        let result
        if (fn.is_block_function)
          result = fn( self, CL2.create_cell(value) )
        else  
          result = fn( value )
        output.emit( result )
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

obj "if"
  {
  in {
    condition: cell // если канал то тогда константы не получается подставлять..
    then_value: cell
    else_value: cell

    then_block&: cell
  }
  output: cell
  current_state: cell 0 // 0 uninited, 1 then case, 2 else case
  current_parent: cell

  // режим if @cond {}
  bind @then_block @then_value

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
        } else {
          //console.log("activate-branch: not block-function",branch_value)
          output.set( branch_value )
        }
  :}

  react @condition {: value |
    //console.log("if react on condition",value)
    //console.trace()
    if (value) {
      if (current_state.get() != 1) {        
        //console.log("if activating branch then",value,"then-value=",then_value.get())
        activate_branch( then_value.get(), value )
        current_state.set( 1 )
      }
    } else {
      if (current_state.get() != 2) {
        activate_branch( else_value.get(), value )
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

