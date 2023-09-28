import os="std/os.cl"

func "action" { arg |
  //print "compiling" @arg
  // тут бы добавить аргумент что компилировать но пока так.
  // потом может будет в конфиге модуля эта информация и не надо будет в аргументах указывать..
  pr: os.spawn "clon" "compile" stdio="inherit"
  return @pr.exitcode
}

func "watch" {
  // создаем однократный вотч (второй параметр true = однократный)
  os.watch "." true | react { val | 
      print "watch reaction! " @val 
      action "watch" // выполним действие
      ====
      watch // будем смотреть опять.
      // итого мы отключаем вотч на момент компиляции и это правильно.
  }
}

action "init" // на старте скомпилируемся
=======
watch // поехали смотреть