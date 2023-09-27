#!./clon r

// идеи - может генерить еще .gitignore

import path="node:path" os="std/os.cl" util="../../tool/utils.js"

init_dir := or (get(os.env(),"DIR")) (os.cwd)
init_file := os.join @init_dir "clon.mjs"
init_file_2 := os.join @init_dir "main.cl"

if ( (os.exist @init_file) or (os.exist @init_file_2)) { cp fil|
  print " cannot init project: clon file already exist. file=" @fil
  =====
  os.stop 1
} else {
  print "generating new project"

  os.write( "README.md",
"# Название проекта
Чтобы использовать этот проект, добавьте в clon.mjs его подключение:

```
export var modules={
  myproj: {git:'https://github.com/name/myproj'},
}
```

и затем импортируйте его в слон-файлах:
```
import mp='myproj'
```
")

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
  os.write("clon.mjs",
`// это файл конфигурации clon-проекта.
// подключаемые пакеты
export var modules={
  //lib3d: {git:"https://github.com/pavelvasev/cl2threejs"},
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
}
