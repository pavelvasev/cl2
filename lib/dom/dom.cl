import std="std/std.cl"

obj "element" 
{
    in {
        tag: cell "div"
        text: cell
        style: cell
        dom_parent: cell // @self.parent
        // это cl-объект с output в котором dom
    }

    output: cell

    init "(obj) => {

        function f() {
            let tagname = tag.get()

            let existing = output.get()
            //if (existing) existing.remove()
            if (existing) throw new Error( 'dom: element already created')
            if (!tag.is_set) {
                output.set( null )
                return
            }

            let elem = document.createElement(tagname);
            output.set( elem )
        }
        f()
        tag.changed.subscribe( f )
    }"

    append_child_dom: method "(ch) => {
        //let parent = self.dom_parent.get()
        let parent = self
        let parent_dom = parent.output.get()        
        let child_dom = ch.output.get()
        if (child_dom instanceof Element)
            // console.log('append_child_dom working, parent_dom=',parent_dom,'child_dom=',child_dom)
            parent_dom.appendChild( child_dom ) // todo insert-adfter
    }"

    bind @self.appended @append_child_dom

/*
    append_dom_to_parent: method "() => {
        //let parent = self.dom_parent.get()
        let parent = self.parent.get()
        let parent_dom = parent.output.get()        
        let self_dom = self.output.get()
        console.log('append_dom_to_parent working, parent_dom=',parent_dom,'self_dom=',self_dom)
        parent_dom.appendChild( self_dom ) // todo insert-adfter
    }"

    bind @self.parent.changed @append_dom_to_parent

    paste "
      console.log('created binding @self.parent.changed @append_dom_to_parent',self.parent.changed,append_dom_to_parent)
    "
*/    

    // таки реакция напрашивается. именно как групаа из bind + method
    // т.е reaction @self.parent {: .... :}
    // ну и еще групповая реакция.. т.е. когда when-any и when-all..


    set_text: method "(t) => {
        //console.log('setting text',t)
        let self_dom = self.output.get()
        self_dom.textContent = t
    }"

    bind @self.text @set_text
    

    set_style: method "(t) => {
        //console.log('setting style',t)
        let self_dom = self.output.get()
        self_dom.style = t
    }"

    bind @self.style @set_style    
}

obj "event" 
{
    in {
        src: cell // dom-элемент события
        name: cell // имя события    
    }
    output: channel

    init "(obj) => {
        let forget = () => {}

        function handler(arg) 
        {
            self.output.emit( arg )
        }

        function setup() {
            forget()

            if (!(src.is_set && name.is_set)) return
            let dom = src.get()
            //console.log('dom-event setup. dom=',dom)
            let n = name.get()
            dom.addEventListener( n, handler )            
            forget = () => {
                dom.removeEventListener( n, handler )
                forget = () => {}
            }
        }
        self.src.changed.subscribe( setup )
        self.name.changed.subscribe( setup )
        setup()

        self.release.subscribe( () => forget() )
    }"
}    

/*
obj "event" {
    src: cell // dom-элемент события
    name: cell // имя события
    output: channel // канал с событиями

    listener: method "(x) => {}"
    listener_installed_to: cell

    reaction @src @name {:
        let dom = src.get()
        if (listener_installed_to.is_set)
            listener_installed_to.removeEventListener( listener.output.get() )
        dom.addEventListener( listener )
    :}
}
*/

// устанавливает текст родительскому элементу
/*
obj "text" {
    text: cell

    init "(obj) => {

        function f() {
            //console.log('fff')
            if (!self.parent.is_set) return
            if (!text.is_set) return

            let parent_dom_cell = self.parent.get().output
            if (!parent_dom_cell.is_set) return
            let parent_dom = parent_dom_cell.get()
            parent_dom.textContent = text.get()
        }
        f()
        self.parent.changed.subscribe( f )
    }"
    
}
*/