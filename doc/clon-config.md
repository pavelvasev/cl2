# Конфигурация проекта

Задается в файле `clon.mjs`
Пример файла

```
export var modules={
  dom: {git:"https://github.com/pavelvasev/dom.cl"},
  chatbot: {git:"https://github.com/pavelvasev/chatbot.cl"}
  //"sigma": "./module-sigma"
}

export var modules_dir="../modules"
export var output_dir="output"
```

* modules - перечень используемых модулей и их источник
* modules_dir - в какой каталог загружать модули
* output_dir - в какой каталог записывать код программы.

# Плагины компилятора
Также в файле clon.mjs можно задать функцию init. Эта функция будет вызвана на старте работы компилятора. Таким образом есть возможность влиять на его работу.
ы```
export function init( state, tool, C ) {
	// state - начальное состояние
	// tool - объект компилятора
	// C - ссылка на загруженный cl2-compiler.js
	// ... влияем на работу компилятора
}
```
