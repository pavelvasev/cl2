#!./clon r

// идеи - может генерить еще .gitignore

import path="node:path" os="std/os.cl" util="../../tool/utils.js"

init_dir := or (get(os.env(),"DIR")) (os.cwd)
init_file := os.join @init_dir "init.js"
init_file_2 := os.join @init_dir "main.cl"

if ( (os.exist @init_file) or (os.exist @init_file_2)) { cp fil|
  print " cannot init project: clon file already exist. file=" @fil
  =====
  os.stop 1
} else {
  print "generating new project: main.cl init.js"
  os.write( "main.cl",
`/* это главный файл пакета. он получает управление при подключении пакета. 
здесь можно указать определения процессов, функций, выполнить разные действия.
введенные определения затем можно использовать в других пакетах.

запуск: clon run [main.cl]
*/

obj "myobj" {
  in {
    input: cell
  }
  output: cell
  init {:
    console.log('object inited')
  :}
  react @input {: value |
    self.output.set( 2 * value )
  :}
}

print "hello world" (myobj 10)

`)
  os.write("init.js",
`// это файл конфигурации пакета.
// подключаемые пакеты
export var modules={
  //lib3d: {git:"https://github.com/pavelvasev/cl2threejs"},
  //"sigma": "./module-sigma"
}

// todo тесты текущего модуля
// export var tests = ["tests/all.cl"]
`)
}
