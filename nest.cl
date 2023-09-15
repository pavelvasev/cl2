#!./clon r

import path="node:path" os="std/os.cl" util="./compiler/tool/utils.js"

# установить модули для модуля dir в проекте root_dir с учетом уже установленных модулей nested

func "nest" { dir root_dir nested |
  print "nesting dir=" @dir
  //conf := apply (get @util "load_module_config") @dir
  conf := apply {: dir | return util.load_module_config(dir) :} @dir
  print "conf = " @conf

  mapped := map (get @conf "modules") { value key |
    dir := get (get @conf "import_map") @key
    print "processing" @key @value "at dir" @dir
  }
  return @mapped
}

init_dir := or (get(os.env(),"DIR")) (os.cwd)
init_file := os.join @init_dir "init.js"


if (os.exist @init_file) {
  print "running"
  result := nest( @init_dir,os.join(@init_dir,"modules"),dict())
  react @result {
    print "finished"
  }
} else {
  print "no init.js file in current dir. nothing for nest."
}
