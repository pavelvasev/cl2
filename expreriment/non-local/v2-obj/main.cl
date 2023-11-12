////////////////////////////////////

import std="std" ws="std/ws.cl"

/* процесс "коммуникатор с той стороной"
   содержит 2 канала
     - input - что послать той стороне
     - output - что присылает та сторона

   процесс "вентилятор"
   аргументы - исходный коммуникатор и словарь целевых коммуникаторов
   распределяет сообщения из исходного коммуникатора в целевые
   и обратно - из целевых пересылает в исходного
   
   дальше мысли такие..
   - научиться соединять коммуникатор и локальный объект синхронизации
   причем так, чтобы это было на основе подписок, а не тупо все данные гонять
   - вообще говоря вентилятор может работать с локальными точками синхронизации напрямую так-то.
   подписываться на них и слать сообщения.. и получать сообщения и писать в них.
   но есть проблема - это пересылка всех без подписки..
   
   стало быть
   - сделать коннектор коммуникатора и локального канала.
   output коммуникатора попадает в канал,
   а output канала попадает в input коммуникатора.
   ну проверять чтобы обратно не отсылалось.
   
   - сделать коннектор такой, который отсылает только если есть подписка.
   ну и при создании он сам высылает подписку.
   ну точнее не при создании, а когда к нему локальные подписки появляются.
   
   получается вообще говоря мы как бы создаем зеркало той стороны.
   ну и такую штучку примитив синхронизации запись в которую приводит
   к посылке в канал, а появление данных в котором - приводит к отправке на ту сторону.
   ну и окей.
   
   вопрос конечно что я как бы и стал уже делать такую штучку в лице endpoint.
   но ее надо проработать. и мб не надо ей быть самой объектом синхронизации,
   а организовать процесс привязки к существующему объекту? ну подумать.

*/



// интересная вещица..  для нас локальный коммуникатор..
// ну так то это не эндпоинт а локальный коммуникатор
process "endpoint" {
  input: channel
  output: channel

/*
  init {:
    // превращаем пару каналов в объект синхронизации. хм...
    
    self.subscribe = output.subscribe.bind(output)
    self.once = output.once.bind(output)
    
    //self.subscribe = input.subscribe.bind(input)
    //self.once = input.once.bind(input)  

    self.submit = (val) => {
      // console.log( "endpoint see submit",val );
      //self.output.submit( val )
      input.submit.bind(output)
    }
  :}
*/
}

// соединение 2х коммуникаторов
process "bind_comm" {
  in {
    from: const
    to: const
  }
  
  bind @from.output @to.output
  bind @to.input @from.input
}

// коммуникатор-распределитель
process "fan" {
  in {
    targets**: cell // словарь коммуникаторов
  }
  unsubs: state []

  input:  channel
  output: channel

  react @output {: data |
     let h = targets.get() // тут словарь коннектов
     let tgt_conn = h[ data.id ]
     if (!tgt_conn) {
       console.error("fan: target ",data.id,"not defined")
       return
     }
     tgt_conn.output.submit( data.value ) // упаковка однако
  :}

  react @targets {: h |
     let names = Object.keys(h);
     unsub_all()
     //console.log("fan see value",value)
     //console.log("fan subscribing to names",names)

     for (let name of names) {
       let tgt_conn = h[name]
       let tgt_name = name;
       let unsub = tgt_conn.input.subscribe( (value) => {
         let data = { id: tgt_name, value }
         // console.log("fan see data",value)
         // но это получается мы безусловно гоним данные
         // а вот узнать, нужны ли они, мы как раз и можем через subscribe/unsubscribe
         // но это на следующем уровне
         input.submit( data )
       })
       self.unsubs.push( unsub );
     }
  :}

  func "unsub_all" {:
    self.unsubs.forEach( x => x() )
    self.unsubs = []
  :}
  react @self.release @unsub_all
}

// коммуникатор 1 ячейки
process "expose_channel" {
//  conn: const
  in {
    ref: cell // ячейка которую представляем
    connect: const false
  }
  
  // протокол коммуникатора
  subscribe: endpoint
  unsubscribe: endpoint
  submit: endpoint

  f: fan subscribe=@subscribe unsubscribe=@unsubscribe submit=@submit
  
  subs_count : state 0

  func "do_subscribe" {:
    let ref_obj = ref.get()
    //console.log("expose see ref_obj: ",ref_obj)
    if (self.unsub_r) self.unsub_r()
    //console.log("do_subscribe perf",ref_obj.$cl_id)
    //console.trace()
    self.unsub_r = ref_obj.subscribe( val => {
      //console.log('ref sub! ',val, 'self.own_submit=',self.own_submit,ref_obj.$cl_id)
      if (self.own_submit) return
      // увы ручками ток
      if (ref_obj instanceof Cell && val == self.own_val) return;
      //if (subs_count > 0) // todo вытащить
      submit.input.submit( val )
    })
  :}  

  react @subscribe.output {: s |
    //console.log('see subscribe!')
    // нам прислали запрос на подписку
    subs_count++
    do_subscribe()
  :}
  react @unsubscribe.output {: s |
    subs_count--
    if (subs_count <= 0 && self.unsub_r) { self.unsub_r(); self.unsub_r = null }
  :}

  react @submit.output {: s |
    self.own_submit = true
    self.own_val = s
    //console.log("see incoming val, setting to ref",s,ref.get().$cl_id)
    ref.get().submit( s )
    //console.log("see incoming val, setted to ref",s)
    self.own_submit = false
  :}

  react @ref {:
    do_subscribe()
  :}

  input: channel
  output: channel

  // подключаем вентилятор
  bind @output @f.output
  bind @f.input @input

  init {:
    if (connect) {
      //console.log(33333333)
      setTimeout( () => {
       // console.log(33333334)
        subscribe.input.submit()
      }, 10 )
    }
    self.release.subscribe( ()=> {
      unsubscribe.input.submit(); // отписываемся
      
      if (self.unsub_r) self.unsub_r()
    })
  :}
}

process "consume_channel" {
  in {
    ref1: cell
  }  
  imixin {
    expose_channel @ref1 true
  }
}


//////////////////////////////////
// коммуникатор 1 объекта
process "expose_process" {

  in {
    ref: cell // ячейка которую представляем
    connect: const false
  }

  input: channel
  output: channel

  //comms_of_ref: cell

  f1: fan
  bind_comm @self @f1

  ref_info: cell

  react @ref {: ro |
    console.log("exposing obj",ro.$cl_id, CL2.get_title(ro),connect)
    let comms = []
    let h = {}
    let info = { channels: [], cells: [], subobjects: [] }
    for (let son of Object.keys(ro)) {      
      //if (son == "children") continue;
      
      let so = ro[son]
      if (so.skip_expose) continue;
      //console.log("see subobj",son,so.$cl_id,connect)
      if (so instanceof CL2.Comm) {
        //console.log("Exposing!")
        h[ son ] = create_expose_channel({ref:so,connect})
      } else if (so instanceof CL2.ClObject) {
        // хм
        // h[ son ] = create_expose_process({ref:so,connect})
      }
      if (so instanceof CL2.Cell)
          info.cells.push(son)
      else if (so instanceof Channel)
          info.channels.push(son)
    }
    ref_info.submit( info )
    //h["__info"] = create_expose_channel( {ref:ref_info,connect} )
    /// вроде как не надо

    // console.log("expose h=",h,"connect=",connect)

    f1.targets.submit( h )
  :}
 
}

process "consume_process" {
  in {
    ref1: cell
  }  
  imixin {
    expose_process @ref1 true
  }
}

/* возможность создать объект и динамически
   ну или наполнить целевой
process "mirror_object" {
  in {
    ref: cell // ячейка которую представляем
  }

  input: channel
  output: channel

  //comms_of_ref: cell

  f1: fan __info=@cr
  bind_comm @self @f1

  ref_info: cell
  cr: consume_channel @ref_info

  react @ref_info {: ri |
     // приехала информация
     for (let name of ri.channels) {

       let c = create_consume_channel
     }
  :}

}
*/


// сервер окружения
// предоставляет доступ к объекту target
// когда надо будет много доступов, то сделать адаптер-сплиттер
process "env_server" {
  in {
    abonent: const // адаптер взаимодействия. т.о. и сервер может ходить к клиенту.
    target: const
  }

  unsubs: state []

  // можем разложить все входящие сообщения на каналы.. или на вызовы фунций и отправки ответов..
  //react @abonent.output {: data | :}

  react @abonent.output {: data |
     if (data.cmd == "subscribe") {
       let name = data.name;
       let item = target[name];

       let unsub = item.subscribe( (val) => {
         abonent.input.submit( val );
       });
       unsubs.push( unsub )

       let reply = { reply_to: data.request_id, sub_id: unsubs.length-1 }
       abonent.input.submit( reply );
     }
     else if (data.cmd == "unsubscribe") {
       let f = unsubs[ data.sub_id ];
       f();
     }
     else if (data.cmd == "submit") {
       let name = data.name;
       let item = target[name];

       item.submit( data.value )

       //let reply = { reply_to: data.request_id }
       //abonent.input.submit( reply );
     } else if (data.cmd == "call") {
       let name = data.name;
       let item = target[name];

       let result = item( ...data.args )

       // todo ждать результат по аналогии с react.. промисы и т.п.

       // todo если результат это объект, то назначить ему id.. адресуемый извне

       let reply = { reply_to: data.request_id, result }
       abonent.input.submit( reply );
     } else if (data.cmd == "expose") {
       // сгенерировать описание...
     }
  :}

}

////////////////////////

mixin "tree_node"
process "node" {
  in {
    a: cell novalue=true// 10
    b: channel
    cf&: cell
  }

  apply_children @cf
}

enva: node 5

react (std.timer) {: enva.a.submit( enva.a.get()+1 ) :}

apply {: console.log("server enva clid is",enva.$cl_id,CL2.get_title(enva)) :}

//////////////////////////

srv: ws.server 8001

react @srv.connection { wss |
  print "see server client"
  
  conn: ws.adapter @wss
  expose_enva: expose_process @enva
  
  f1: fan obj1=@expose_enva
  bind_comm @conn @f1
}

/////////////////////////

cli: ws.client "http://localhost:8001"

if @cli.open {

  client_enva: node

  consume_enva: consume_process @client_enva
  f2: fan obj1=@consume_enva
  bind_comm @cli @f2

  print "client_enva.a = " @client_enva.a
  
  apply {: 
      console.log("client_enva clid is",client_enva.$cl_id,CL2.get_title(client_enva)) 
      console.log("clid is",client_enva.a.$cl_id) 
  :}

}

/*
react @cli.output {: d |
  console.log( "----> client got data",d )
:}
*/


/*
connect @cli "object1" { obj |
  // вот obj это представитель удаленного объекта..

  print "obj status is" @obj.status
}
*/
/*
sigma: remote_channel @cli "sigma"

sigma := connect_to_channel @cli "sigma"

srv: remote_object @cli "id"// { some }
======

srv := remove_object @cli "id"
react @srv { srvobj |
  bind @srvobj ...
}
*/