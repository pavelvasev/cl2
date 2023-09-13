# тестируем порядок подготовки входных значений на каналах процессов
import std="std"

# todo ввести отлов чего печатаем

/*
x := 10
print @x
*/


pr0 := print "p0" @y (10 + (@y * 2))
y := 10

react (std.timer 0 n=5) {: val|
  console.log("--------------------------------------- set y",val)
  y.set( 100 +50*val)
  ///t0.destroy()
:}


############# вручную сделанное
pr1:= print "manual=" (get @a 0) (get @a 1)
a := apply { x | return (list @x (10 + (@x * 2))) } @x
x := 10

react (std.timer start=50 n=1) {:
  console.log("--------------------------------------- set x")
  x.set( 100 )
  //console.log("--------------------------------------- set y")
  //y.set( 150 )
  //t.destroy()
  //t.destroy()
:}

###############################
#pr1_c := gather_events @pr1
pr0_c := reduce_events @pr0 'start' {: e acc | return `${acc}; ${e}` :}
pr1_c := reduce_events @pr1 'start' {: e acc | return `${acc}; ${e}` :}
#print "p1 events:" @pr1_c
#react @pr1 {: console.log('rrrr') :}

react (std.timer n=1 interval=250) {
  assert (@pr0_c == 'start; p0,10,30; p0,100,210; p0,150,310; p0,200,410; p0,250,510; p0,300,610')
  assert (@pr1_c == 'start; manual=,10,30; manual=,100,210')
}