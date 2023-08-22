import std="std/std.cl" dom="std/dom/dom.cl"

obj someobj {
  in() {
    title: cell("OK")
  }
  output: cell()
  //dom_parent: cell @parent
  root_sm: dom.element("button",title,dom_parent=self.parent)
  bind( root_sm.output,output )

  reaction( dom.event( root_sm "click"), "() => {
    console.log('clicked',self.title.get())
    }")
}

obj main {
  output: cell()

  root: dom.element("div",style="display: flex;flex-direction: column;") {
    btn: dom.element( "button","+" )
    
    dom.element( "h3","Output:" )

    output_space: dom.element( "div",style="border: 1px solid grey" )

    //reaction (dom.event @btn.output "click") {:  :}

    reaction( dom.event( btn,"click") "() => {
      let newobj = create_someobj( {title: `OK ${Math.random()}`} )
      //console.log('created newobj=',newobj)
      output_space.append( newobj )
    }")

  }
  bind( root,output )
}