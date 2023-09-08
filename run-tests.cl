#!./cl-tool r
import os = "std/os.cl" std="std"

#print "running tests"
tests := reduce_events (k: os.spawn "find" "tests.official" "-name" "main.cl") [] {: s acc| return acc.concat(s.split("\n").filter(q => q != '')) :}

func "join" {: arr sep | return arr.join(sep) :}

func "format_summary" { |s|
  return (join (map @s (func { |line|
    code := get @line 1
    name := get @line 0
    return (+ (if (@code == 0) "  OK" "FAIL") " : " @name)
  })) "\\n")
}

react @k.exitcode (func {
  
  print "found tests" @t2
  //t2 := apply {: t | return t.sort() :} @tests
  t2 := std.sort @tests
  summary := map @t2 (func { |test|
    print "============= running test" @test
    r: os.spawn 'cl-tool' 'r' @test // stdio='inherit'
    //react @r.stdout (func { |msg| print @msg })

    react @r.stdout {: msg | process.stdout.write(msg) :}
    react @r.stderr {: msg | process.stdout.write('stderr:'+msg) :}
    react @r.exitcode (func { |code|
      print "============= finished test" @test "exitcode" @code
      //if (@code > 0) { apply {: console.log('throwing error'); throw "error" :} }
    })
    return (list @test @r.exitcode)
  })
  print ("summary is\\n" + (format_summary @summary))
})

