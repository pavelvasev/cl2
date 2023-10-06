// F-DEFAULT-CL
// содержимое которое доступно всем безо всяких пакетов

// таки мысли что надо сделать Cl2.create_reaction( comm, code )
obj "react" {
  in {
    input: channel
    action: cell
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

  init {: obj |
    self.pending_finish = CL2.create_cell(1)
    console.channel_verbose('------------- react: ',self+'','listening',input+'')
    let unsub = input.on( (value) => {
      let fn = action.get()

      // F-REACT-ORDER
      let finish = CL2.create_cell()
      let pending_finish = self.pending_finish
      self.pending_finish = finish // теперь другие эту будут читать

      pending_finish.once( () =>       //console.log('react input changed. scheduling!',self+'','value=',value)
      CL2.schedule( () => { // принципиальный момент - чтобы реакция не срабатывала посреди другой реакции
        console.channel_verbose('react got scheduled control. invoking scheduled action. self=',self+'')

        let result = fn( value )

        console.channel_verbose('react result=',console.fmt_verbose( result+'' ),'self=',self+'')

        // мега-идея промис js в том, что если результат это канал, то процесс продолжается..
        // т.е. нам как бы вернули информацию, что процесс еще идет и результаты уже у него

        if (result instanceof CL2.Comm) {
          console.channel_verbose('react see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?

          // ну и еще странно что - получается будем запускать следующую реакцию пока даже 
          // эта еще не закончилась. и начнут спутываться значения (их очередность)
          // возможно, реакцию стоит брать в работу, когда ее предыдущий процесс закончился
          // а пока не закончился копить? какое правило?

          let unsub = result.once( (val) => {
            console.channel_verbose('react got once tick. val=',val+'',typeof(val),'result(channel)=',result+'','self=',self+'')
            output.submit( val )
            finish.submit(true)
          })
        }
        else if (result instanceof Promise) {
          result.then( val => {
            output.submit(val)
            finish.submit(true)
          })
        }
        /*
        else if (result.once) { ползьуемся тем что ClObject это Comm
          result.once( val => {
            output.submit(val)
          })
        }
        */
        else {
          //console.log('submitting result to output',output+'')
          output.submit( result )
          finish.submit(true)
        }
      }, obj)
      )
    })

    self.release.on( () => unsub() )
  :}
}

func "list" {: ...values | return values :}

////////////////////////////////////////////////
//////////////////////////////////////////////// деревья
////////////////////////////////////////////////

obj "tree_child" {
  parent: cell
  // ссылка на parent-а, вдруг кому-то надо
  // но кстати а лифту то надо? или он как?

  react @self.release {: 
     if (self.parent.is_set) {
       let p = self.parent.get()
       p.tree.forget( self )
     }
  :}
}


// сборщик
obj "tree_lift" base_code="create_tree_child({})"{
  in {
    allow_default: cell true
  }

  req: cell     // храним тут заявки
  children: cell  // а тут результат сбора

  gather_request: channel
  gather_request_action: channel
  bind @gather_request @gather_request_action overwrite_mode=true

  init {:
    self.req.submit( new Set() )
    self.is_tree_lift = true

    //self.gather_request.submit( true )
    //console.log("______ self.allow_default.get()=",self.allow_default.get(),'self=',self+'')
    if (self.allow_default.is_set && self.allow_default.get())
    CL2.schedule( () => {      
      if (!self.children.is_set) {
         //console.log("------------------> tree gather default pre-request",self+'')
         //self.children.set( [] )
         self.gather_request.submit()
      }
      },self)    
  :}

  func "append" {: child |
    let r = self.req.get()
    if (r.has( child )) return

    r.add( child )
    // мы получается и лифтов добавляем. ок.

    //console.log("submit gather-request - due to tree_lift append. self=",self+'',"child=",child+'')
    self.gather_request.submit()
  :}

  func "forget" {: child |
    let r = self.req.get()
    r.delete( child )
    //console.log("submit gather-request - due to tree_lift forget",self+'')
    self.gather_request.submit()
  :}

  /// процесс сборки

  func "gather_list" {: elems | // elems = array or set
    let result = []
    let monitor = []

    //console.log("~~~~ gather_list for tree=",self+'')

    elems.forEach( element => {
      //console.log("checking elem=",element+'',"is_lift=",element.tree?.is_tree_lift)
      if (element.tree?.is_tree_lift) {

        if (element.tree.children.is_set)
            result = result.concat( element.tree.children.get() )
        else {
          // важный момент. там еще не собрали же
          //console.log("!!!!!!!!!!!!!!! this sublift children pending!")
          result.pending = true
        }

        monitor.push( element.tree.children.changed )
        // важно реагировать на changed а не на просто.
        // потому что если на просто то зацикливание
        // ибо мы там делаем подписку subscribe, а children будучи ячейкой
        // сразу же высылает результат. и мы пере-стартуем сборку. так не надо.

      } else {
        result.push( element )
      }
    })

    //console.log("!!!!!!!!!!!!!!!!! finished gather_list for tree=",self+'')
    return { result, monitor }
  :}

  r_gather: react @gather_request_action {:
    //console.log("tree_lift see gather request ",self+'')
    let r = self.req.get()
    let {result, monitor } = gather_list( r )

    self.stop_listen_lifts.get()()
    let stop_lifts = []
    monitor.forEach( co => {
      //let b = CL2.create_binding( co, self.gather_request )
      //let unsub = co.subscribe( self.gather_request.submit.bind( self.gather_request ) )
      let unsub = co.subscribe( (val) => {
        //console.log("sumb gather-request - due to sub-lift output changed, self=",self+'',"sublift channel =",co+'')
        self.gather_request.submit( val)
      })
      stop_lifts.push( unsub )
    })
    self.stop_listen_lifts.submit( () => {
      stop_lifts.forEach( cb => cb() )
      self.stop_listen_lifts.submit( () => {} )
     } )

    //console.log("children collected, self=",self+'',"result=",result.length,'pending?',result.pending ? true : false)

    if (!result.pending) // какие-то лифты еще не готовы
        self.children.submit( result )

    return true
  :}

  stop_listen_lifts: cell {: return true :}
  r_release: react @self.release {:
      self.stop_listen_lifts.get()() 
      // решено обнулить чилдренов чтобы парент реальный их забыл
      //console.log('react self.children clear',self+'')
      self.children.submit( [] ) // а не возникнет ли излишняя галиматься?
      return true
  :}

}

// узел

obj "tree_node" base_code="create_tree_lift({})" {

  init {:
    self.is_tree_lift = false
    // закончим формирование списка детей но не сразу
    CL2.schedule( () => {
      if (!self.children.is_set) {
         //console.log("------------------> []",self+'')
         //self.children.set( [] )
         //self.gather_request.submit()
      }   
      },self)
  :}

  r_set_parent: react @self.children {: arr |
     let parent_object = self.attached_to // к чему прицеплен tree_node
     // решил хранить ссылку на родителя объекта, а не tree_node/tree_lift.

     //console.log("ok tree node : children=",arr.map( x => x+''),self+'')

     arr.forEach( elem => elem.tree.parent.set( parent_object ))
     return true
  :}

}

// надо для compute.js но и связано с tree-штуками нашими
obj "func_process" {
    tree: tree_lift // сборщек детей
    output: cell    // и обычный результат

    init {: 
      self.subscribe = self.output.subscribe.bind( self.output )
      self.once = self.output.once.bind( self.output )
      self.$title = "cofunc_process"
    :}
}

obj "apply_children" {
  in {
    action: cell
    rest*: cell
  }

  init {:
    CL2.schedule( () => {
    if (!action.is_set) {
      self.tree.gather_request.submit();
      //console.log("ISSUED DEFAULT GATHER REQUEST",self+'')
    }
    },self) // я думал приоритета по умолчанию не хватит но хватает
  :}
  //u: extract @rest
  output: cell

  tree: tree_lift allow_default=false // сборщик чилдренов

  //react @action {: console.log("see action") :}
  //react @rest {: console.log("see rest") :}

  result := react (list @action @rest) {:
      //console.log("************************ apply_children action! self=",self+'')
      let f = action.get()
      let args = rest.get()
      
      stop_result_process()

      if (f && args) {
        //console.log("calling")
        //console.log("-------------- apply_children call! self=",self+'')
        let res = f( ...args )
        // console.log( "apply_children: appending result",self+'',res)
        // тут у нас гарантированно процесс прислали
        if (res?.tree) {
          self.tree.append( res ) // усе поехала сборка
          res.attached_to = self // чтобы имена разруливать
          //return CL2.create_cell( res ) // екранируем
        } else {
          // ну пусть чего-то там собирают тогда
          self.tree.gather_request.submit()
        }
      }
    :}

  func "stop_result_process" {: // это все заради бонуса чтобы аргументы передавать
    if (self.result.is_set) {
      let p = self.result.get()
      p.destroy()
      self.result.set( CL2.NOVALUE )
    }
  :}
  react @self.release @stop_result_process

  bind @tree.children @output
}

////////////////////////////////////////////////
//////////////////////////////////////////////// другое
////////////////////////////////////////////////


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
obj "xtract" {
  in {
    input: cell // можно channel но монитору нужна ячейка
  }
  
  output: cell fast=true
  //output: channel // а что если? что-то не выходит но вариант же

    o2: channel
    bind @o2 @output
    //bind @o2 @output.changed

    init {: obj |
      let p = CL2.monitor_rest_values( input, o2 )
      //console.log("mon rest vals!", input.get() )
      obj.release.subscribe( p )
    :}

    //react @o2 {: v | console.log('xtract return:',v) :}
}

// ну вроде как нам не надо прямо чтобы вот процесс.. функция тоже норм теперь 
// когда мы из функций процессы делаем
func "print" {: ...vals | console.log(...vals); return vals :}


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
  current_process: cell

  tree: tree_lift

  // прислали блок else 
  r_else_obj: react @_else {: val |
    // if (debug)
    // console.log("r1")
    let s1 = val.value.subscribe( (ev) => {
      //console.log("r2",ev)
      else_branch.set( ev )
    })
  :}

  func "cleanup_current_process" {:
      //console.log("cleanup_current_process",current_process.get())
      if (current_process.is_set) {
          let cp = current_process.get()
          cp.destroy()
          current_process.set( CL2.NOVALUE )
        }
    :}

  react @self.release @cleanup_current_process  

  func "activate_branch" {: branch_value arg |
      cleanup_current_process()
      //console.log("activatre bra",branch_value)

      //console.log("activate-branch: ",branch_value)
      if (branch_value === CL2.NOVALUE) {
        self.output.submit() // может тож новалую?
        return
      }

      // если подали не функцию - ну вернем что подали.
      // if cond 10 else 20
      if (typeof(branch_value) !== "function") {
        self.output.submit( branch_value )
        return
      }

      //let arg_cell = CL2.create_cell( arg )
      //CL2.attach_anonymous( cp, arg_cell )

      let res = branch_value( arg ) // может им не надо таки arg то. а то это значение жеж.
      //console.log("res=",res+'')
      // cp то надо или нет уже
      if (res instanceof CL2.Comm) {
        let b = CL2.create_binding( res, self.output )
        //console.log("b created")
        // по идее при удалении res биндинг удалится
        // почему? раззабскрайбится разве что..
      }
      // Comm и ClObject вместе отработают
      if (res instanceof CL2.ClObject) {
        current_process.set( res )
        tree.append( res )
      }
  :}

  // заменили then-блок
  r_on_then_val: react @then_branch {: value |
    if (current_state.get() == 1) {
      activate_branch( then_branch.get(), condition.get() )
    }
  :}

  // заменили else-block
  r_on_else_val: react @else_branch {: value |
    //console.log("else_value changed:",else_value.get(),"current_state.get()=",current_state.get(),"condition=",condition.get())
    if (current_state.get() == 2) {
      //console.
      activate_branch( else_branch.get(), condition.get() )
    }
  :}

  r_on_cond: react @condition {: value |
    // console.log("if react on condition",value + "",current_state.get(),"self=",self+"",'then=',then_branch.get())
    // console.trace()
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

// может быть не скопу искать а сразу ячейку куды писать
func "find_return_scope" {: start |
    start ||= self
    let p = start.parent && start.parent.is_set ? start.parent.get() : start.attached_to
    // console.log('============ return acting',self+"",self)
    // console.log("============ return reacting", p+"")
    // console.trace()
    while (p) {
      //console.log("=========== return checking p=",p+"")
      if (p.output && p.is_return_scope) {
        return p
      }
      //console.log("it has no ouytput",JSON.stringify(p))
      p = p.parent ? p.parent.get() : p.attached_to
    }
:}


// исп: block { some things } -> output_func где output_func функция создания содержимого блока
obj "block" {
  in {
    output&: cell
  }
}


// вход - список каналов/ячеек
obj "when_all2" {
  in {
    rest*: cell
  }
  output: cell

  bind @rest @output
}


obj "when_all3" {
  in {
    rest*: cell
  }
  output: channel
  init {: 
    let unsub = () => {}
    rest.subscribe( (list) => {
      unsub()
      //console.log("when-all subscribe")
      let q = CL2.when_all( list )
      // вот все-таки порты LF и наши каналы это разное. 
      // ибо порты их держат сооощение 1 такт. и это прикольно.
      // а нас пока спасает что там внутри - delayed стоит.
      let b = CL2.create_binding( q, output )
      unsub = () => { q.destroy(); b.destroy() }

      //q.subscribe( qqq => console.log("when-all sending",qqq))
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
  //u: extract @rest
  output: cell

  //react @action {: console.log("see action") :}
  //react @rest {: console.log("see rest") :}

  xx: react (list @action @rest) {:
      //console.log("main reaction!")
      let f = action.get()
      let args = rest.get()
      //console.log("x-apply",f,args)

      if (f && args) {
        //console.log("calling")
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
  //console.log("or checking",values)
   for (let i=0; i<values.length; i++)
     if (values[i]) return values[i]
   return false
:}
alias "or" "||"

// нет даже идей во что она превратит 0
func "not" {: value |   
   return (!value)
:}

///////////////////////

func "equal" {: ...values |
   // какое надо equals? строгое или нестрогое?
   // сделал пока строгое
   for (let i=1; i<values.length; i++)
     if (!(values[i] === values[i-1])) return false
   return true  
:}
alias "equal" "=="

func "not_equal" {: ...values |
   // какое надо equals? строгое или нестрогое?
   // здесь сделаем нестрогое
   for (let i=1; i<values.length; i++)
     if ((values[i] == values[i-1])) return false
   return true  
:}
alias "not_equal" "!="

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
     if (!(values[i-1] > values[i])) return false
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
/*
obj "assert" {
  in {
    cond: cell
    message: cell
  }
  output: cell
  bind @cond @output

  compiler_hook {: obj state |
    obj.params.message ||= obj.locinfo.short
  :}

  react @cond {: val |
    if (!val) {
      // но надо бы подождать message.. но она например зависла.. и ассерт тогда не сработает..
    }
  :}
}
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

// кандидат на вылет ибо dict так щас научен делать
/*
func "list_to_dict" {: nodes |
   let h = {}
   for (let k of nodes) {
      h[ k[0] ] = k[1] 
   }
   return h   
:}
*/

func "keys" {: obj |
  if (Array.isArray(obj)) return [...Array( obj.length ).keys()]
  if (obj instanceof Map) return obj.keys()
  if (obj instanceof Set) return obj.keys()  
  return Object.keys(obj)
:}

func "values" {: obj |
  if (Array.isArray(obj)) return obj
  if (obj instanceof Map) return obj.values()
  if (obj instanceof Set) return obj.keys()  
  return Object.values(obj)
:}

func "concat" {: a b | 
   //console.log('concat',a,b)
   if (Array.isArray(a)) return [...a,...b]
   if (a instanceof Set) return {...a,...b}
   if (typeof(a) == "object") return {...a,...b}
   console.error("a=",a,"b=",b)
   throw `concat: incompatible types.`
:}

// ну пока такое
func "range" {: max |
  let arr = new Array(max)
  for (let i=0; i<max; i++) arr[i] = i
  return arr
:}

func "len" {: obj |
    if (Array.isArray(obj)) return obj.length
    if (obj instanceof Map) return obj.size()
    if (obj instanceof Set) return obj.size()
    return Object.keys(obj).length
:}

func "join" {: obj sep |
    return obj.join(sep)
:}

func "flatten" {: obj |
    return obj.flatten()
:}

//func "dict" {: rest_values | return values :}

// функция создания словаря
// можно сделать как func если научимся именованные параметры в функции передавать
// применение: ключи и значения можно указывать как позиционные параметры и как именованные
// все что указано и сформирует итоговый словарь
// dict [k v k v] [k=v k=v]
// либо
// dict arr [k=v k=v] где arr содержит пары, т.е [ [k v] [k v] ...]
obj "dict" {
  in {
    rest_pos*: cell
    rest_all**: cell
  }  
  output: cell

  //print "rest_all=" @rest_all

  //xtracted := extract @rest_all

  merged := apply {: list kv |
      if (list.length == 0) return kv
      //if (Object.keys(kv))
      let h = {...kv}
      if (list.length == 1) // случай dict arr
      {
        let nodes = list[0]
        for (let k of nodes) {
              h[ k[0] ] = k[1] 
        }
      }
      else
      for (let i=0; i<list.length; i+=2) // значения из позиционных аргументов
        h[ list[i] ] = list[i+1]

      return h
  :} @rest_pos @rest_all

  //merged := concat @xtracted_pos @xtracted

  bind @merged @output
}

// ну а если там ячейка?
func "get" {: src field | 
    //let val = src[field] 
    return src[field] 
:}

func "slice" {: list start length | return list.slice( start,length ) :}

func "map" {: arr f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,index) {
    return new Promise( (resolve,reject) => {
    let result = f( e,index )
    //console.log('map process_elem result=',result+'')
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
          //console.log('submitting result',result+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0 ) {
    //..console.log('map process_arr called, i=',i)
    if (i >= arr.length) {
      //console.log('map process_arr: resolved finish')
      return Promise.resolve([])
    }

    return process_elem( arr[i],i ).then( (result) => {
      //console.log('map process_arr: resolved iter result=',result+'')
      return process_arr( arr,i+1 ).then( (rest_result) => {
        // дорогая передача..
        return [result,...rest_result]
      })      
    })
  }

  function process_dict( arr,names,i=0 ) {
    //console.log('map process_dict')
    if (i >= arr.length) return Promise.resolve([]) 
    // ? получается map @dict это массив значений??

    return process_elem( arr[i],names[i] ).then( (result) => {
      return process_dict( arr,names, i+1 ).then( (rest_result) => {
        return [result,...rest_result]
      })
    })
  }  

  let output = CL2.create_cell(); //output.attached_to = self
  output.$title = "map_fn_output"
  // [...arr] переводит в массив принудительно, если там было Set например
  if (!Array.isArray(arr)) {
    if (arr instanceof Set)
        arr = [...arr]
  }

  //console.log("START map typeof(arr) =",typeof(arr),'self=',self+'' ,'arr=',arr)
  //console.log('start_MAP. self=',self+'')

  if (!Array.isArray( arr )) 
    process_dict( Object.values(arr), Object.keys(arr) ).then( values => output.submit( values ))
  else  
    process_arr( arr ).then( values => {
      //console.log('map done. values=',values)
      output.submit( values )
    })
  return output
:}

func "filter" {: arr f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e, index) {
    return new Promise( (resolve,reject) => {
    let result = f( e, index )
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


  let output = CL2.create_cell(); //output.attached_to = self
  output.$title = "filter_fn_output"

  if (!Array.isArray(arr)) arr = [...arr]
  process_arr( arr ).then( values => output.submit( values ))
  return output
:}

func "reduce" {: arr acc_init f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,index,acc) {
    return new Promise( (resolve,reject) => {

    let result = f( e, index, acc )
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

    return process_elem( arr[i],i,acc ).then( (result) => {
      return process_arr( arr,i+1,result )
    })
  }

  function process_dict( arr,names,i=0,acc ) {
    if (i >= arr.length) return Promise.resolve(acc)

    return process_elem( arr[i],names[i],acc ).then( (result) => {
      return process_dict( arr,names, i+1, result )
    })
  }  

  let output = CL2.create_cell(); //output.attached_to = self
  output.$title = "titles_fn_output"

  // [...arr] переводит в массив принудительно, если там было Set например
  if (!Array.isArray(arr)) {
    if (arr instanceof Set)
        arr = [...arr]
  }
  if (typeof(arr) == "object") 
    process_dict( Object.values(arr), Object.keys(arr),0,acc_init ).then( values => output.submit( values ))
  else  
    process_arr( arr,0,acc_init ).then( values => output.submit( values ))
  return output  
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

// на вылет, сделано wait (====)
/*
func "sequence" {: ...blocks |
    console.log("seq called, blocks=",blocks)
    let fn = blocks[0]
    let next_blocks = blocks.slice(-1)
    
    let result = fn()

    function next(val) {
      console.log("seq finished! going next")
      if (blocks.length > 1)
        return sequence( ...blocks.slice(-1) )
      console.log("seq all finished. val=",val)  
      return val
    }

    // далее идет полное непонимание происходящего.
    // и вообще я рассчитывал на реакцию а она не случилась..
    if (result instanceof CL2.Comm) {
      // console.log('see channel, subscribing once')
      // вернули канал? слушаем его дальше.. такое правило для реакций
      // но вообще это странно.. получается мы не можем возвращать каналы..
      // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
      let next_result = CL2.create_channel()
      //  next_result.is_nxt = true
      let unsub = result.once( (val) => {
        // console.log('once tick',val,output+'')
        let next_val = next( val )
        if (next_val instanceof CL2.Comm)
          next_val.once( r => next_result.submit(r) )
        else  
          next_result.submit( next_val )
      })
      return next_result
    }
    else if (result instanceof Promise) {
      return result.then( val => {
        return next( val )
      })
    }
    else {
      //console.log('submitting result to output',output+'')
      return next( val )
    }

:}
*/

/*
func "sequence2" { blocks |

  fn := get @blocks 0

  r  := apply @fn // кстати идея а не подать ли какой-то аргумент..
  print "sequecne executing fn=" @fn "blocks=" @blocks

  react @r {: val |
    if (exit_scope.output.is_set) {
       // закончили упражнение
    } else {
      if (blocks.length > 0)
        return sequence( blocks.slice(1) )
      return val
    }
  :}
}
*/