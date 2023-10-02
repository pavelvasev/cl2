import os="std/os.cl" std="std"

func "action" { arg |
  //print "compiling" @arg
  // тут бы добавить аргумент что компилировать но пока так.
  // потом может будет в конфиге модуля эта информация и не надо будет в аргументах указывать..
  pr: os.spawn "clon" "compile" stdio="inherit"
  return @pr.exitcode
}

func "watch" {
  // создаем однократный вотч (второй параметр true = однократный)
  // трындоз нода 20 если меньше 5 секунд то срабатывает на старых файлах, которые еще до того как
  // были сделаны
  // видимо какая-то реализация
  react (std.timer period=5000 n=1) {
    os.watch "." true | react { val | 
        print "watch reaction! " @val
        xt:= action "watch" // выполним действие
        print "action finished xt=" @xt
        ====
        watch // будем смотреть опять.
        // итого мы отключаем вотч на момент компиляции и это правильно.
    }
  }
}

action "init" // на старте скомпилируемся
=======
watch // поехали смотреть