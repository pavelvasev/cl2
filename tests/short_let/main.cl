// проверяем оператор :=

a := 10 + 20
b := @a * 2
print @a @b (@b / 5)

func "test" {: stdout |
  setTimeout( () => {
    let s = stdout()
    console.log('test see stdout:',s,s.indexOf("30 60 12"))
    console.assert( s.indexOf("30 60 12") >= 0 )
  }, 100)
:}

/*
obj "test" {
  in {stdin:channel}
  timeout 1000 {
    assert (includes @r "30 60 12")
  }
}
*/