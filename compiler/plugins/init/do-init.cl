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
"Это Ваш CLON-проект
===================
* Главный файл проекта main.cl - в нём код программы
* Файл настроек проекта clon.mjs - в нём указывается список подмодулей и другие настройки.

Запуск программы
================

Чтобы запустить программу, выполните:
```
clon run
```

")

os.write( "modules.md",
"Подключение внешних модулей
============================
Чтобы добавить внешний модуль в проект:
1. Отредактируйте файл clon.mjs и добавьте ссылки нужные на модули
```
export var modules={
  myproj: {git:'https://github.com/name/proj'},
  other: '../my/dir'
}
```
Ссылки на модуль можно указывать 2х видов:
* ссылки на гит-хранилища вида {git:'https://github.com/name/proj'},
* ссылки на папки на диске вида './path/to/dir'

2. Установите модули командой `clon nest`

Затем импортируйте модули в слон-файлах:
```
import my='myproj' other='other'
```
и используйте:
```
my.obj 1 2 3 (other.func 4 5)
```

Автоматизация
=============
Для упрощения добавления модуля сделана команда `clon add <url|dir>` которая
1. Добавляет ссылку на модуль в файл clon.mjs
2. Запускает установку модулей `clon nest`.

Использование проекта как модуля
================================
Чтобы использовать этот проект в других проектах как под-модуль
1. Опубликуйте его в виде гит-хранилища в Интернете или в виде папки на диске. 
2. Добавьте на него ссылки в других проектах согласно инструкции выше.

")

  os.write( "main.cl",
`#!/usr/bin/env -S clon run

/* это главный файл пакета. он получает управление при подключении пакета. 
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
======
print "* setting permissions"
os.chmod "main.cl" "755"  
=====
print "done\n"
=====
print (os.read "README.md")
}
