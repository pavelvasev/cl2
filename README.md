# Язык CLON
Вычислительная модель предполагает частичный порядок выполнения операций, а не последовательный как обычно.
Пример того как будут выполнены шаги:
```
a := @b + 1                        // шаг 3
b := math.sin (@x) + math.cos (@x) // шаг 2
print @a                           // шаг 4
x := os.fetch "http://current.x"   // шаг 1
return @a                          // шаг 4.1 после шага 4
```


# Лицензия
Типа MIT.
2023 Pavel Vasev