import std="std/std.cl"

x: method {: a b | return a+b :}
// а почему вот нельзя например method просто в корне применять? надо self..
std.print (x 1 2)
// а почему нельзя вот метод вызвать ако функцию?