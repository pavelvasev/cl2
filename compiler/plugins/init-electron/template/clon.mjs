// это файл конфигурации clon-проекта.
// подключаемые пакеты
export var modules={
  dom: {git:"https://github.com/pavelvasev/dom.cl"},
  //"sigma": "./module-sigma"
}

// надо рассчитать и сообщить выходной каталог
import * as path from "node:path"
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export var output_dir=path.join(__dirname,"electron")

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
