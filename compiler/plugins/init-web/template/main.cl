/* это главный файл проекта. он получает управление при его подключении к другим проектам.
здесь можно указать определения процессов, функций, выполнить разные действия.
введенные определения затем можно использовать в других проектах и на веб-странице.
*/

import std="std" dom="dom.cl"

mixin "tree_node"
process "box" {
  in { cf&:cell }
  output := dom.element "div" style="display: flex; flex-direction: column; border: 1px solid;" cf=@cf
}

mixin "tree_node"
process "main" {

  output := box {
    dom.element "h3" "Input:"
    input_space: dom.element "textarea" style="height: 300px;"
    btn: dom.element "button" "Visualize!"

    dom.element "h3" "Output:"

    output_space: dom.element "div" style="border: 1px solid grey"

    react (dom.event @btn.output "click") {:
      let odom = output_space.output.get()
      let idom = input_space.output.get()
      odom.textContent = idom.value
    :}

  }

}


