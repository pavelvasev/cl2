map(config.modules) { |name value|
  let dir = module_dir(value)
  ~ clone_sync(value.src,dir)
}

func module_dir_name { |module_record|
  // https://github.com/pavelvasev/cl2threejs.git
  split(module_record.src,"/") | last() | split(".") | first()
}

func module_dir { |module_record|
  let dirname = module_dir_name(module_record) // вычисление имени каталога модуля
  let dir = +("./cl-modules/",dir)
  ~ dir
}

func clone_sync { |src dir|
  if (fs.exist(dir)) {
    os.exec("git pull",cwd=dir)
  } else {
    os.exec("git clone",src,dir)
  }
}

здесь return заменено на символ.
ну и в целом я думаю что можно сделать так что если только 1 окружение
то return можно не писать т.к. понятно из чего результат.
а вот если несколько - то тогда можно даже и требовать его наличия.
ну в случае func/cofunc.

===

в этой версии что мы в целом видим. что выделены структурные операторы в отдельный синтаксис.
ну среди таких
- let он не требует писать скобочек. но если там две параметры то нужны уже запятые.
- return тоже не требует скобочек
- ну для if тоже может быть..

в целом будто бы... 

ну что такое скобочки - это оператор обращения к eval на самом деле. типа если без них 
то это ссылка на переменную, а со скобочками - операция обращения.
но типа let, return на них не надо ссылаться?
но кстати а вот if - вполне себе можно представить и функцией на которую сослаться.
но опять же если надо на if сослаться то может быть удобнее - оформить его в лямбду.