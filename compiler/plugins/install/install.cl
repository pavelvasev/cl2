func "process_module" { |rec cloned|
  let dir = module_dir @rec
  if (dir != ".") {
    clone_sync @value.src @dir
    let next_cloned = (list ...@cloned @dir)
    let m = load_modules_list @dir
    map @m { |rec| return process_module @rec @next_cloned }
  }
}

map @tool.config.modules { |name value|
  let dir = module_dir @value
  clone_sync @value.src @dir
}

func "module_dir_name" { |module_record|
  // https://github.com/pavelvasev/cl2threejs.git
  // return (split module_record "/" | last | split "." | first )
  return (first (str.split (last (str.split (get @module_record "src") "/")) "."))
}

func "module_dir" { |module_record|
  let dirname = module_dir_name @module_record // вычисление имени каталога модуля
  let dir = (+ "./cl-modules/" @dir)
  return @dir
}

func "clone_sync" { |src dir|
  if (fs.exist @dir) {
    os.exec "git pull" cwd=@dir
  } else {
    os.exec "git clone" @src @dir
  }
}