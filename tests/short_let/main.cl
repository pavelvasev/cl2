// проверяем оператор :=

a := 10 + 20
b := @a * 2
print "hello"
print @a @b (@b / 5)
print "world"

//============ test

func "test" {: stdout |
  setTimeout( () => {
    let s = stdout()
    console.log('test see stdout:',s,s.indexOf("30 60 12"))
    console.assert( s.indexOf("30 60 12") >= 0 )
  }, 100)
:}

/*
obj "test" {
  in {stdin:cell}
  timeout 1000 {
    assert (includes @stdin "30 60 12")
  }
}
*/
