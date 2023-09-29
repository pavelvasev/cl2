#!./clon r

// идеи - может генерить еще .gitignore
// ну и можно генерить словарь и его писать
// а еще можно создать прокси-объект на основе словаря, для доступа к файловой системе
// это кстати интересно будет. и права этому объекту - read, read-write, write-if-not-exist и тп

import path="node:path" os="std/os.cl" util="../../tool/utils.js"

init_dir := or (get(os.env(),"DIR")) (os.cwd)
files := list 'README.md' "clon.mjs" "main.cl" "index.html" | map { item | os.join @init_dir @item }
existing_files := filter @files { f | os.exist @f }

if ((len @existing_files) > 0) { cp arg |
  print " cannot init project: clon files already exist. files=" @existing_files
  =====
  os.stop 1
} else {
  print "generating new web project"
  ====
  print "* writing files"
  ====
  readme_content := '# Название проекта

* Исходный код проекта находится в файле main.cl
* Веб-страница записана в файл index.html

Запуск проекта
==============

Чтобы запустить проект, выполните трансляцию файла main.cl и запустите любой веб-сервер, 
например командой `clon && npx http-server`

Для упрощения, добавлен скрипт
```
web-dev.cl
``` 
которая
- запускает веб-сервер и открывает браузер с веб-страницей
- при изменении файлов перекомпилирует проект и обновляет веб-страницу.

'
  os.write( "README.md",@readme_content)
  os.write( "main.cl",
`/* это главный файл проекта. он получает управление при его подключении к другим проектам.
здесь можно указать определения процессов, функций, выполнить разные действия.
введенные определения затем можно использовать в других проектах и на веб-странице.
*/

import std="std" dom="dom"

obj "box" {
  in { cf&:cell }
  output := dom.element "div" style="display: flex; flex-direction: column; border: 1px solid;" cf=@cf
}

obj "main" {
  
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


`)
  os.write("clon.mjs",
`// это файл конфигурации clon-проекта.
// подключаемые пакеты
export var modules={
  dom: {git:"https://github.com/pavelvasev/dom.cl"},
  //"sigma": "./module-sigma"
}

// todo тесты текущего модуля
// export var tests = ["tests/all.cl"]

// функция init вызывается на старте компилятора
// в ней можно добавить команды компилятора и другие изменения в его поведение
/*
export function init( state, tool ) {
  
  tool.add_command( "mycommand", (arg1,arg2) => {
    // например, в ответ на команду запускаем слон-файл
    return tool.get_command("run")( path.join(__dirname,"do-init.cl"), arg1, arg2 )
  } )
  tool.add_command("mc", tool.get_command("mycommand"))  
}
*/
`)

os.write("index.html",  
`<!doctype html>
<head>
<title> Привет, мир!</title>
</head>
<body>

<script type="module">
  import * as M from "./main.cl.js"
  M.create_main({}).output.changed.subscribe( elem => {
    document.documentElement.appendChild( elem )
  })
</script>

</body>
`)

os.write("web-dev.cl",
`#!/usr/bin/env -S clon run

print "starting web dev"

import os="std/os.cl"

// запускаем лайв-сервер который обновляет веб-страницу при изменении файлов
// проект https://github.com/tapio/live-server
os.spawn "npx" "--yes" "live-server" stdio="inherit"
// другой вариант: https://vitejs.dev/guide/
// os.spawn "npx" "--yes" "vite" "--open" stdio="inherit"

// запускаем перекомпиляцию при изменении файлов
os.spawn "clon" "watch" stdio="inherit"
`)
=====
print "* setting permissions to web-dev.cl"
os.chmod "web-dev.cl" "755"
=====
print "* copy favicon"
os.cp (+ (__dirname) "template") "."
=====
print "* installing modules 2"
r: os.spawn "clon" "nest" stdio="inherit"
react @r.exitcode {
  //print (os.read "README.md")
  print @readme_content
}
}
