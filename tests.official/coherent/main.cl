# тестируем порядок подготовки входных значений на каналах процессов
import std="std"

# todo ввести отлов чего печатаем

print "p0" @y (10 + (@y * 2))
y := 10

react (t0: std.timer 10) {:
  y.set( 100 )
  t0.destroy()
:}


print (get @a 0) (get @a 1)
a := apply { x | return (list @x (10 + (@x * 2))) } @x
x := 10

react (t: std.timer 10) {:
  x.set( 100 )
  //t.destroy()
  t.destroy()
:}