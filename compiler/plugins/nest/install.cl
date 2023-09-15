// загружаем для проекта в текущем каталоге все гит-модули на которые он ссылается

func "go" { |tool state|
  let to_git_list = (process_module "." @tool @state)
  return (map @to_git_list { |rec|
    dir = apply @tool.get_module_dir @rec
    return (clone_sync @rec.git @dir)
  })
}

func "process_module" { |dir tool state|
  let conf = (apply @tool.load_module_config @dir @state)

  let to_git = filter @conf.modules { |m| return @m.git }

  let to_git_them = (flatten (map @conf.modules { |rec|
    let dir = (apply @tool.get_module_dir @rec )
    return (process_module @dir @tool @state )
  }))

  return list(@to_git ...@to_git_them)
}

func "clone_sync" { |src dir|
  if (fs.exist(@dir)) {
    os.exec "git" "pull" cwd=@dir
  } else {
    os.exec "git" "clone" @src @dir
  }
}