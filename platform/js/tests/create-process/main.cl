# Создаем процесс изнутри функции

obj "proc1" {

  init {:
    console.log("proc1 started")
    self.is_proc1 = true
  :}

  react @self.release {:
    console.log("proc1 finished")
  :}
}

func "foo" {
  p: proc1
  return @p
}

a := foo
print "foo returned" (apply {: item | return item+'' :} @a)

assert (get @a "is_proc1")