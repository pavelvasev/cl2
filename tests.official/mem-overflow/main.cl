# Смотрим за памятью
import std="std" os="std/os.cl"

func "foo" { x |
  y := (10 * @x) + (@x * @x) + 1 
  return @y
}

// todo прикол if-ветка первым получает парент-а.. а это вообще надо, так явно
n := if (os.env | get "N") { parent val | print "got val=" @val return @val } else { return 10 }
print "n=" @n

react (std.timer period=0 n=@n) { cnt |
  a := foo @cnt
  print "foo (" @cnt ") returned" @a
}
