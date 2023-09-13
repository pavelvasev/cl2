
// сортировка по умолчанию получается.. ф-ю критерия если передавать, то надо arr.sort менять т.к. он с промисами не работает
func "sort" {: arr | return arr.sort() :}

// todo добавить start время начала и count сколько раз сработать.
// ну и можно сигнал restart
// timer n=1 interval=500 | timer n=10 - вот как-то бы так их постыковать ))) но тогда первое это start-trigger?
obj "timer" {

  //cells interval=1000 output=0
  in {
    restart: channel
    interval: cell 1000 
    start: cell -1
    n: cell -1
  }
  /* из LF идея
    offset: cell 0
    period: cell 0
  */

  output: channel
  count: cell
  running: cell false

  init "(obj) => {
    obj.interval.changed.subscribe( f )
    let existing
    let existing_timeout

    function stop() {
    	if (existing) {
         clearInterval( existing )
      }
      if (existing_timeout)
        clearTimeout( existing_timeout )
      existing = null
      running.set( false )
    }

    function on_tick() {
        console.log('on-tick',count.get())

        obj.output.emit()

        if (n.get() >= 0) { // логика остановки
          count.set( count.get() + 1 )
          if (count.get() >= n.get()) {
            stop()
            return false
          }
        }

        return true
    }

    function f( start_reached ) {
    	stop()
      if (n.get() == 0) return

      count.set( 0 )

      if (start.get() >= 0) {
         if (start.get() == 0)
             start_reached = true
         if (start_reached) {
           if (!on_tick()) 
             return
         }
         else {
           existing_timeout = setTimeout( () => f(true), start.get() )
           return
         }
      }

      running.set( true )
    	existing = setInterval( on_tick, obj.interval.get() )      
    }

    obj.release.subscribe( stop )

    f()
  }"
}

obj "counter" {
  in {
    input: channel
    value: cell 0
  }  
    //output: cell
    output: channel

    func "x" {:
	     self.value.set( self.value.get()+1 )
	     return self.value.get()
    :}

    react @input @x
    bind @value @output
}

/*
obj "js_func" {
  in {
    code: cell    
  }
  output: cell

  m: method "(value) => {
      let js_func = eval(value)
      return js_func
    }"

  bind @code @m
  bind @m @output
}

// но так-то это очень круто если мы реакцию выражаем через связи
obj "reaction" {
  in {
    input: channel
    func: cell
  }
  m: method @func
  bind @input @m
}
*/




obj "add" {
  // rest* : cell
  // output: channel
    in {
      rest*: cell
    }

    output: cell

    x: func {: values |
	    let sum = values[0]
	    for (let i=1; i<values.length; i++)
		    sum = sum + values[i]
	    return sum
    :}

    u: extract @rest

    xx: react @u.output @x /// было @u
    bind @xx.output @output /// было @xx

    //bind @rest @output   
}



/*
  // вот тебе три сразу записи.. и for их должен поймать
  for i in (range 0 100) {
  }
  // но кстати
  for (range 0 100) { |i|
  }
*/

/*
compile "let" check_params={: params | return true :} {: obj state |
  let base = { main: [], bindings: [] }

  //  и фичеры.. это у нас дети которые не дети 
  if (obj.features_list) {
    let mod_state = C.modify_parent(state,obj.$name)
    for (let f of obj.features_list) {
      let o = C.one_obj2js_sp( f, mod_state )
      base.main.push( o.main )
      //bindings.push("// bindings from feature-list")
      base.bindings.push( o.bindings )
    }
  }
  
  let strs = []
  for (let k in obj.params) {
    let val = obj.params[k]
    //let s = `let ${k} = ${val.toString()}`
    let val_str = val?.from ? "CL2.NOVALUE" : C.objToString(val)
    let s = `let ${k} = CL2.create_cell( ${val_str} )`
    strs.push( s )
    if (val?.from) {
      //let q = `let ${name} = CL2.create_binding(${obj.params[0].from},${obj.params[1].from})`
      let q = `CL2.create_binding(${val.from},${k}) // from let expr`
      base.bindings.push( q )
    }
  }
  base.main.push( strs )

  return base  
:}
*/

/*
form "if" {: record records index |
    let next = records[index+1]
    if (next.basis == "else") {
      let obj = records[index+1]
      let if_record = record
      records[index+1] = null      
      if (obj.params.hasOwnProperty('0')) {     
        if_record.params.else_value = obj.params[0] // вариант else const
        if (obj.links.hasOwnProperty('0')) { // вариант else (some-expr) и else @link
          /// ето ссылка
          if_record.links.else_value = obj.links[0]
          if_record.links.else_value.to = "else_value"
          if_record.features_list ||= []
          if_record.features_list.push( obj.features_list[0] )
        }
      } else { // вариант else {}        
        let v = Object.values( obj.children )
        v.this_is_env_list = true
        v.env_args = obj.children_env_args
        // todo сделать чилдренов такими же как значение параметров
        // т.е. это массив вот с ключами дополнительными
        if_record.params.else_value = v
      }
    }
    record.basis = "do_if"
    return true // restart
:}
*/

/*
react @x { |x|
  let y = (add @x 2)
  return (mul @y 10) => emit @somechannel @y
}

// ну неплохо же выглядит.
react (x) { |x|
  let y = add(x,2)
  return mul(y,10) => emit(somechannel,y)
}
*/


