/* это главный файл пакета. он получает управление при подключении пакета. 
здесь можно указать определения процессов, функций, выполнить разные действия.
введенные определения затем можно использовать в других пакетах и на веб-странице.
*/

import std="std" dom="dom"

obj "box" {
  in { cf&:cell }
  output := dom.element "div" style="display: flex; flex-direction: column; border: 1px solid; padding: 5px;" cf=@cf
}

obj "main" {
  output: cell

  root: box {
    dom.element "h3" "Enter input:"
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
  bind @root.output @output
}