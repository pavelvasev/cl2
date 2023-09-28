# Как создать nodejs-приложение

* Создайте пустую папку для нового проекта и войдите в неё
* Выполните команду `clon init` которая создаст файлы для проекта
* Редактируйте файлы проекта
* запускайте программу командой `clon run` или напрямую через nodejs `node main.cl.mjs`.

## Пример
* mkdir sample
* clon init
* Задайте текст в main.cl
```
import std="std"
print "hello worlds!" @y @x
y := 10 * std.timer()
x := apply {: y | return Math.sin(y*Math.PI/180) :} @y
```
* Запустите программу: `clon run`
* Вывод приложения:
```
hello worlds! 0 0
hello worlds! 10 0.17364817766693033
hello worlds! 20 0.3420201433256687
hello worlds! 30 0.49999999999999994
...
```