#!./clon r

// идеи - может генерить еще .gitignore
// ну и можно генерить словарь и его писать
// а еще можно создать прокси-объект на основе словаря, для доступа к файловой системе
// это кстати интересно будет. и права этому объекту - read, read-write, write-if-not-exist и тп

import path="node:path" os="std/os.cl" util="../../tool/utils.js"

init_dir := or (get(os.env(),"DIR")) (os.cwd)
files := list 'README.md' "clon.mjs" "main.cl" "index.html" | map { item | os.join @init_dir @item }
existing_files := filter @files { f | os.exist @f }

if ((len @existing_files) > 0) { cp arg |
  print " cannot init project: clon files already exist. files=" @existing_files
  =====
  os.stop 1
} else {
  print "generating new project"
  ====
  print "* copy template"
  os.cp (+ (__dirname) "template") "."
  =====
  print "* installing modules"
  r: os.spawn "npm" "install" stdio="inherit"
  #r: os.spawn "clon" "install" stdio="inherit"
  react @r.exitcode {
    //print (os.read "README.md")
    //print @readme_content
    print "Done. To start app, run web-dev.cl"
  }
}
