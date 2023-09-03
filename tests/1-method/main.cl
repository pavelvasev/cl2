import std="std/std.cl"

func "x" {: a b | return a+b :}
// а почему вот нельзя например method просто в корне применять? надо self..
// print (x 1 2)
// а почему нельзя вот метод вызвать ако функцию?

func "xx" { | a b |
 //return (x (x @a @b) 10)
 return 5
}

print (xx 2 3)