// F-DEFAULT-CL
// содержимое которое доступно всем безо всяких пакетов

// таки мысли что надо сделать Cl2.create_reaction( comm, code )
process "react" {
  in {
    input: channel
    action: cell
  }

  init {: obj |
    self.pending_finish = CL2.create_cell(1)
    console.channel_verbose('------------- react: ',self+'','listening',input+'')
    let unsub = input.subscribe( (value) => {
      let fn = action.get()

      // F-REACT-ORDER
      /*
      let finish = CL2.create_cell()
      let pending_finish = self.pending_finish
      self.pending_finish = finish // теперь другие эту будут читать
      */

      //pending_finish.once( () =>       //console.log('react input changed. scheduling!',self+'','value=',value)
      // console.log("react scheduling",value)
      CL2.schedule( () => { // принципиальный момент - чтобы реакция не срабатывала посреди другой реакции
        // console.log("react scheduled run",value)
        console.channel_verbose('react got scheduled control. invoking scheduled action. self=',self+'')

        let result = fn( value )

        console.channel_verbose('react result=',console.fmt_verbose( result+'' ),'self=',self+'')

        // мега-идея промис js в том, что если результат это канал, то процесс продолжается..
        // т.е. нам как бы вернули информацию, что процесс еще идет и результаты уже у него
        
      }, obj)
      //)
    })

    self.release.on( () => unsub() )
  :}
}

// вход - список каналов/ячеек
obj "when_all" {
  in {
    rest*: cell
  }
  output: cell

  bind @rest @output
}


process "apply" {
  in {
    action: cell
    rest*: cell 
  }
  // todo добавить поле input и тогда пайпы получится делать для apply
  output: cell

  react (when_all @action @rest) {:
      
      let f = action.get_default(null)
      let args = rest.get_default(null)

      //console.log("perform: f=",f,"args=",args)

      if (!(f && args)) {
        //console.log("non-ready")
        return; // не готовое
      }
        
        let result = f( ...args )

        //console.log("result=",result)

        // реагируем только на func-process у нас такая договоренность ждать его результат
        // остальное возвращаем как есть. если кому надо - может создать func-process.

        if (result?.is_func_process) {
          // если с тех пор задали другой процесс.. то этот бы надо и забыть.. todo?
          let unsub = result.then( (val) => {
            console.channel_verbose('react got once tick. val=',val+'',typeof(val),'result(channel)=',result+'','self=',self+'')
            output.submit( val )
            // todo тут нужна очередность соблюдать вызовов.. ехехех...
            //finish.submit(true)
          })
        }
        else
          output.submit( result )

/*
        if (result instanceof CL2.Comm || result?.is_func_process) {
          console.channel_verbose('react see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?

          let unsub = result.once( (val) => {
            console.channel_verbose('react got once tick. val=',val+'',typeof(val),'result(channel)=',result+'','self=',self+'')
            output.submit( val )
            //finish.submit(true)
          })
        }
        else if (result instanceof Promise) {
          result.then( val => {
            output.submit(val)
            //finish.submit(true)
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          output.submit( result )
          //finish.submit(true)
        }
*/        
    :}

}

paste "
function generate_func_caller_js( fun ) {
"

process "func_caller" {
  in {
    rest*: channel // было cell но тогда медленно отрабатывают включения. а мы хотим F-REST-REACT-ASAP
  }
  output: cell
  
  r: react @rest {: args |
    console.channel_verbose("co-func called '${name}'. self=",self+'')
    let rr = fun( ...args )
    console.channel_verbose("co-func finished '${name}'. self=",self+'','result=',console.fmt_verbose(rr))
    return rr
  :}
  //react @output {: self.destroy() :}

  bind @r.output @output
}

paste "

  return (initial_values) => create_func_caller(initial_values)
}
"

func "list" {: ...values | return values :}

paste_file "tree.cl"

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
// по сути то вызов monitor_rest_values -- надо заменить.. todo

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

transform "if" {: i objs state|

  let obj = objs[i]
  obj.basis = "__if"
  obj.basis_path = [ "__if" ]
  // переделали в if

  let next_obj = objs[i + 1]
  //console.log("NX=",next_obj )
  if (next_obj?.basis == "else")
  {
    obj.params.else_branch = next_obj.params[0]
    // todo так-то надо и подвыражения переносить
    // но в будущем я надесюь что они будут упакованы в значение параметра.
    
    // удаляем етот else
    objs.splice( i+1, 1 )
  }
  
  //console.log("transform iff helo returning slice!",objs.length,s.length,s);
  return [i,objs]
:}

// if cond then-func [else] else-func
obj "__if"
  {
  in {
    //input: cell
    condition: cell // если канал то тогда константы не получается подставлять..
    then_branch: cell
    else_branch: cell false // todo что бы это значило..
  }
  output: cell
  current_state: cell 0 // 0 uninited, 1 then case, 2 else case
  current_process: cell

  imixin { tree_lift }

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
      if (res instanceof CL2.Comm || res?.is_func_process) {
        let b = CL2.create_binding( res, self.output )
        //console.log("b created")
        // по идее при удалении res биндинг удалится
        // почему? раззабскрайбится разве что..
      }
      // Comm и ClObject вместе отработают
      if (res instanceof CL2.ClObject) {
        current_process.set( res )
        if (res.is_tree_element)
            self.append( res )
        
        /* когда таким образом мы добавляем контекст функции res в свое дерево tree,
           то не происходит связи по теме parent-child.
           и как следствие при удалении res дерево tree все еще считает
           res подавшим заявку.

           значит объект должен хранить ссылку на того кому он подал заявку.
           и уведомлять его. а до парента дойдет как-нибудь..

           todo!
        */

        //res.release.subscribe( ()=>tree.forget(res) )
        // todo см tree_child

        // а что плохого в том что наше tree выставит себя парентом res?
        // даже если оно лифт.. ну потому что оно лифт..
        // а идея лифтов - проталкивать детей к узлам..
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
// убрал - по факту не используется
/*
obj "block" {
  in {
    output&: cell
  }
}
*/

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

// анализирует входящий поток и смотрит там ячейку
// значения этой ячейки и выдает наружу
// мб это channel_to_value и сделать аналогичное value_to_channel?
// зачем оно нам?
process "read_value" {
  in {
    input: cell
  }
  output: cell
  binding: state

  init {:
    input.subscribe( comm => {
      if (self.binding) self.binding.destoy();  
      self.binding = CL2.create_binding( comm, output )
    })
    self.release.subscribe( () => {
      if (self.binding) self.binding.destoy();  
    })
  :} 
}

// читает значение из ячейки, и к нему относится как к объекту с ячейками
// пример: read_cell @someobj "property"
// idea: приводить к read_cell записи вида @alfa.beta.gamma ...
// но там надо смотреть, если beta не ячейка - то просто ее читать.
// а так то это пайпа: read @x | read_cell "y" | read_cell "some"
process "read_cell" {
  in {
    input: cell
    cell_name: const
  }
  output: channel
  binding: state

  init {:
    input.subscribe( comm => {
      if (self.binding) self.binding.destoy();  
      self.binding = CL2.create_binding( comm[ cell_name ], output )
    })
    self.release.subscribe( () => {
      if (self.binding) self.binding.destoy();  
    })
  :} 
}

// мб стоит создать лучше Cl2.promise_to_func_process 
// и тогда apply будет его результаты возвращать
process "read_promise" {
  in {
    input: cell
  }
  output: cell

  init {:
    input.subscribe( comm => {
      // todo убирать старое
      comm.then( value => {
        output.submit( value )
      })
    })    
  :} 
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
// todo перевести это на формы...

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


paste_file "events.cl"

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

func "replace" {: src pattern repl |
  return str.replaceAll( pattern, repl )
:}

func "regexp" {: pattern flags |
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
  return new RegExp( pattern, flags )
:}

///////////////////////

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
    return obj.flat(Infinity)
    // Infinity означает полный уровень вложенности. А по умолчанию 1.
:}

func "compact" {: obj |
    return obj.filter( x => x )
:}

//func "dict" {: rest_values | return values :}

// функция создания словаря
// можно сделать как func если научимся именованные параметры в функции передавать
// применение: ключи и значения можно указывать как позиционные параметры и как именованные
// все что указано и сформирует итоговый словарь
// dict k v k v k=v k=v
// либо
// dict arr, где arr содержит пары, т.е [ [k v] [k v] ...]
/* примеры: 
      * dict "alfa" 5 "beta" 7
      * dict alfa=5 beta=7
      * dict (list (list "alfa" 5) (list "beta" 7))
*/
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

func "subslice" {: list start length | return list.slice( start,start+length ) :}

paste_file "./map-reduce.cl"


/* создает tree-элементы согласно arr
   repeater @arr { item | elements.. }

   мысли на будущее:
   - оптимизировать, для этого запоминать с какими начальными значениями создавали..
   делать передачу ячеек наверное не следует, это усложнит всю систему.
   если кому-то надо ячейки, они их могут упаковать в значения и передать в них.
*/
mixin "tree_lift"
process "repeater" {
  in {
    input: cell []
    action&: cell // действие
  }
  // аутпута не будет - все в children

  running: cell [] // список запущенных контекстов

  react (list @input @action) {: args |
    forget_all()

    let running_acc = []
    let f = args[1]
    let input = args[0]
    let index = 0;

    for (let r of input) {
      //console.log("repeater r=",r)
      let result = f( r, index );
      running_acc.push( result )
      self.append( result )
      index++
    }
    running.set( running_acc )
  :}

  func "forget_all" {:
    running.get().map( r => r.destroy() ) // пока так
    running.submit( [] )
  :}

  react @self.release {: forget_all() :}
}

// это у нас такая форма - quote
// todo пример
form "quote" {: obj state C|
  let self_objid = C.obj_id( obj, state )
  let strs = [`let ${self_objid} = CL2.create_object();`,
  `let ${self_objid}_output = CL2.create_cell(${ JSON.stringify(obj.params[0]) });`,
  `CL2.attach( ${self_objid}, 'output',${self_objid}_output )`
  ]
  return {main: strs, bindings: [], obj_id: self_objid}
:}
