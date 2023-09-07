# F-REST-SUBST
сделать rest-подстановку при передаче позиционных аргументов: 
`print *@arr`

----
F-LIST-COMM
функция посылки всех элементов списка в канал
и обратно - сборка элементов из канала в список.
кажется универсально и удобно

submit-list @list @channel
gather-list @channel @list

но кстати:
(gather-list @channel) -> list
(submit-list @list) -> channel
т.е. оно не куда-то сабмитит, а создает свой канал и в него сабмитит.
так почему-то лучше.

как назвать?
gather-list
gather-events

----
F-EVENTS-REDUCE
получает сообщения и обрабатывает их накапливая, и выдавая результат
reduce @channel '' {: val acc | acc + val :}
- в целом это реакция, такая форма
- gather-list можно выразить через reduce

----
F-PIPES
F-PIPES-INPUT-ARG
pipe-ы вернуть
при этом проверить что идет позиционная подстановка input-аргумента.
т.е. если сигнатура foo (input alfa beta) то тогда
some | foo alfa beta
а input подставляется пайпой.

-----
F-DESTROY-EXPR
Удаление объекта долно приводить к удалению и его под-выражений (они идут в attached-дереве).
a: foo (some (expr))
... a.destroy() - должно удалить и some и expr.
