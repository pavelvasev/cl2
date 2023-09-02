map @config.modules (cofunc { |name value|
  let dir = module_dir @value
  return (clone_sync @value.src @dir)
})

func "module_dir_name" { |module_record|
  // https://github.com/pavelvasev/cl2threejs.git
  return (split module_record "/" | last | split "." | first )
}

func "module_dir" { |module_record|
  let dirname = module_dir_name @module_record // вычисление имени каталога модуля
  let dir = (+ "./cl-modules/" @dir)
  return @dir
}

func "clone_sync" { |src dir|
  return (if (fs.exist @dir) {
    return (os.exec "git pull" cwd=@dir)
  } else {
    return (os.exec "git clone" @src @dir)
  })
}