////////////////////////////////////////////////
//////////////////////////////////////////////// деревья
////////////////////////////////////////////////

// todo совместить попробовать tree-узлы и собственно объекты
// а то они сейчас вынесены, см dom.cl и "if"

// include "tree.cl" или load "tree.cl" ?
// ну к тому что удобно файл бы разбивать на части
// а сейчас получается это не очень то возможно.

obj "tree_child" {
  parent: cell skip_expose=true
  // ссылка на parent-а, вдруг кому-то надо
  // но кстати а лифту то надо? или он как?
  lift_parent: cell skip_expose=true
  // ссылка на лифт-парент
  // но кстати нужна ли она? проще же в attached_to постучаться..
  // но технически оказалось что элемент принадлежит и паренту, и лифт-паренту
  // и "вычеркивать" при удалении надо именно из лифт-парента, а то он иначе опять собирает.
  // хотя конечо последний как правило это attached_to но 

  //tree_element: cell 1 // на параметр заменить
  init {:
    self.is_tree_element = true
  :}

  react @self.release {:
     //console.log('child release!',self+'','parent=',self.parent.get() + '')
     
     let p = self.lift_parent
     // todo сделать таки тему чтобы эта штука себя из лифта удаляла
     // а лифт себя удалял из ноды
     /*
     let my_mb_lift_host = self.attached_to?.attached_to
     if (my_mb_lift_host && my_mb_lift_host.tree && my_mb_lift_host !== p)
        my_mb_lift_host.tree.forget( self.attached_to )
      else
     */ 
     if (p.is_set) {
       //console.log("thus calling parent forget of",self.attached_to+'')
       let pp = p.get()
       pp.forget( self.attached_to )
       // self.attached_to это узел где размещен tree_child
     }
  :}
}


// сборщик
mixin "tree_child"
obj "tree_lift" //base_code="create_tree_child({})"{
{
  in {
    allow_default: cell true skip_expose=true
  }

  req: state skip_expose=true       // храним тут заявки
  children: cell skip_expose=true  // а тут результат сбора

  gather_request: channel skip_expose=true
  gather_request_action: channel skip_expose=true
  bind @gather_request @gather_request_action overwrite_mode=true

  init {:
    self.req = new Set()
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
    let r = self.req
    if (r.has( child )) return

    r.add( child )
    // мы получается и лифтов добавляем. ок.
    // todo слушать destroy и вызывать forget.

    child.lift_parent.set( self )

    //console.log("submit gather-request - due to tree_lift append. self=",self+'',"child=",child+'')
    self.gather_request.submit()
  :}

  func "forget" {: child |
    let r = self.req
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
      if (element.is_tree_lift) {

        if (element.children.is_set)
            result = result.concat( element.children.get() )
        else {
          // важный момент. там еще не собрали же
          //console.log("!!!!!!!!!!!!!!! this sublift children pending!")
          result.pending = true
        }

        monitor.push( element.children.changed )
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
    let r = self.req
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

  stop_listen_lifts: cell skip_expose=true {: return true :}
  r_release: react @self.release {:
      self.stop_listen_lifts.get()() 
      // решено обнулить чилдренов чтобы парент реальный их забыл
      //console.log('react self.children clear',self+'')
      self.children.submit( [] ) // а не возникнет ли излишняя галиматься?
      return true
  :}

}

// узел

mixin "tree_lift"
obj "tree_node" {

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
     arr.forEach( elem => elem.parent.set( self ))
     return true
  :}

}

// надо для compute.js но и связано с tree-штуками нашими
mixin "tree_lift"
obj "func_process" {
    //tree: tree_lift // сборщек детей
    output: cell    // и обычный результат

    init {: 
      self.subscribe = self.output.subscribe.bind( self.output )
      self.once = self.output.once.bind( self.output )
      self.then = self.once
      self.$title = "cofunc_process"
      self.is_func_process = true
    :}
}

// добавляет детей из указанного описания (данного в форме функции)
// apply_children @children_arr
process "apply_children" {
  in {
    action: cell
    rest*: cell
  }

  init {:
    CL2.schedule( () => {
    if (!action.is_set) {
      self.gather_request.submit();
      //console.log("ISSUED DEFAULT GATHER REQUEST",self+'')
    }
    },self) // я думал приоритета по умолчанию не хватит но хватает
  :}
  //u: extract @rest
  output: cell

  imixin { tree_lift allow_default=false }

  result := apply {:
      //console.log("************************ apply_children action! self=",self+'')
      let f = action.get()
      let args = rest.get()
      
      stop_result_process()

      if (f && args) {
        //console.log("calling")
        //console.log("-------------- apply_children call! self=",self+'',args)
        let res = f( ...args )
        // console.log( "apply_children: appending result",self+'',res)
        // тут у нас гарантированно процесс прислали
        if (res?.is_tree_element) {
          self.append( res ) // усе поехала сборка
          res.attached_to = self // чтобы имена разруливать
          return CL2.create_cell( res ) // екранируем
        } else {
          // ну пусть чего-то там собирают тогда
          self.gather_request.submit()
        }
      }
    :} @action @rest 

  // это все заради бонуса чтобы аргументы передавать
  func "stop_result_process" {: 
    if (self.result.is_set) {
      let p = self.result.get()
      if (p && p.is_set) p = p.get() // значение процесса (контекста) f
      if (p) {
          //console.log("apply_children: destroy p=",p)
          p.destroy()
      }
      self.result.set( CL2.NOVALUE )
    }
  :}
  react @self.release @stop_result_process

  bind @self.children @output
}

// просто узел для использования по месту
mixin "tree_node"
process "node" {
  in { cf&: cell }
  apply_children @cf
}