import std="std" dom="dom.cl" lib3d="lib3d.cl"

dom.custom "cl-main"
mixin "tree_node"
process "main" {
  in { style: cell }

  datapos := apply {: return Array(100*3).fill(0).map( (elem,index)=>Math.random() ) :}
  b1: lib3d.buffer @datapos 3

  output := dom.column style=@style {
    dom.dark_theme

    //btn: dom.element "button" "Visualize!" {: console.log("clicked") :}
    cb: dom.checkbox "lines visible"
    scale: dom.input "range" input_value=50 min=0 max=200
    output_space: dom.element "div" style="border: 1px solid grey; flex: 1;"

    s: lib3d.scene {
      lib3d.point_light    
      p1: lib3d.points color=[1,0,1] 
              positions=@b1.output scale=@scale.interactive_value
      lib3d.lines color=[1,1,1] 
              positions=@b1.output scale=@scale.value visible=@cb.value
    }

    cam: lib3d.camera
    cam_control: lib3d.camera_control camera=@cam.output dom=@rend.canvas

    rend: lib3d.render input=@s.output view_dom=@output_space.output camera=@cam.output    
  }
}