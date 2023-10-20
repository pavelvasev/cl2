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

func "print" {: ...vals |  
  std::cout << args
  return {args...}
:}

