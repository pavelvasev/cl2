#!./clon r

// Программа установщик модулей CLON для текущего проекта.

import path="node:path" os="std/os.cl" util="../../tool/utils.js"

# установить модули для модуля dir в папку modules_root_dir с учетом уже установленных модулей nested

func "download" { spec dir |
  if (get @spec "git") {
    print "this is git. syncing." @dir
    return (if (os.exist @dir | read_promise) {
      print "git dir exist. issuing pull."
      k: os.spawn "git" "pull" dir=@dir stdio='inherit'
      return @k.exitcode
    }
    else {
      print "git dir not exist. issuing clone."
      k: os.spawn "git" "clone" (get @spec "git") @dir stdio='inherit'
      return @k.exitcode
    })
  } else {
    return 1
  }
}

/* spec - ссылка на модуль в форме { git: ... } или строчки
   dir - целевой каталог для установки модуля
   modules_root_dir - заданная папка установки модулей
   nested - список уже установленных папок
   need_download - признак что надо загружать

   1. возможно загружает модуль (need_download)
   2. считывает его конфигурацию
   3. проходит по модулям указанным в конфигурации и пытается их установить
*/
func "nest" { spec dir modules_root_dir nested need_download|
  print "******* nest dir=" @dir "modules_root_dir=" @modules_root_dir

  if (get @nested @dir) {
    // уже обработали
    print "already processed"
    exit @nested
  }
  =====
  if (@need_download) {
      d := download @spec @dir
      return @d
  }
  =====
  print "--- download finished"
  //print "checking conf dir=" @dir
  //conf := apply (get @util "load_module_config") @dir
  conf := apply {: dir modules_root_dir | 
       return util.load_module_config(dir,modules_root_dir) :} @dir @modules_root_dir 
       | read_promise
       
  //print "conf = " @conf
  //print "see modules: " (get @conf "modules")

  subnested := concat @nested (dict @dir true)

  s2 := reduce (get @conf "modules") @subnested { value key acc |
    submodule_dir := get (get @conf "import_map") @key
    modules_dir := get @conf "modules_dir"
    return (apply @nest @value @submodule_dir @modules_dir @acc true)  // 
    
    //return (apply @nest @value @submodule_dir (get @conf "modules_dir") @acc true)

    //print "s2 subnest dir=" @dir "key=" @key "submodule_dir=" @submodule_dir 
  }
  #print "s2=" @s2
  #print "subnested=" @subnested

  return (concat @subnested @s2)
}

init_dir := or (get(os.env(),"DIR")) (os.cwd)
init_file := os.join @init_dir "clon.mjs"

if (os.exist @init_file) {
  print "running nest"
  result := nest( dict(), @init_dir, false, dict(), false) // (+ @init_dir "/modules")
  //print "result = " @result
  react @result { val |
    print "finished" @val
  }
} else {
  print "no clon.mjs file in current dir. nothing for nest."
}
