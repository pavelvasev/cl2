#!./clon r

// Программа установщик модулей CLON для текущего проекта.

import path="node:path" os="std/os.cl" util="../../tool/utils.js"

# установить модули для модуля dir в проекте root_dir с учетом уже установленных модулей nested

func "download" { spec dir |
  if (get @spec "git") {
    print "this is git. syncing." @dir
    return (if (os.exist @dir) {
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

func "nest" { spec dir root_dir nested need_download|
  print "nest" @dir

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
  print "checking conf dir=" @dir
  //conf := apply (get @util "load_module_config") @dir
  conf := apply {: dir | return util.load_module_config(dir) :} @dir
  // print "conf = " @conf
  print "see modules: " (get @conf "modules")

  subnested := concat @nested (dict @dir true)

  s2 := reduce (get @conf "modules") @subnested { value key acc |
    dir := get (get @conf "import_map") @key
    return (apply @nest @value @dir @root_dir @acc true)
  }
  #print "s2=" @s2
  #print "subnested=" @subnested

  return (concat @subnested @s2)
}

init_dir := or (get(os.env(),"DIR")) (os.cwd)
init_file := os.join @init_dir "clon.mjs"

if (os.exist @init_file) {
  print "running"
  result := nest( dict(), @init_dir, os.join(@init_dir,"modules"), dict(), false)
  //print "result = " @result
  react @result { val |
    print "finished" @val
  }
} else {
  print "no clon.mjs file in current dir. nothing for nest."
}
