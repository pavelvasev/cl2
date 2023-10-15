#!./clon r
# можно добавить в файл .git/hooks/pre-commit строку ./run-tests.cl || (echo "commit failed!"; exit 1)
// todo параллельный запуск уже хочу. это так-то parallel-map по идее. вида parallel_map @data n=4 fn

import os = "std/os.cl" std="std"

dir := or (os.env | get "DIR") "tests.official"
print "running tests from dir" @dir
tests := reduce_events (k: os.spawn "find" @dir "-name" "main.cl") [] {: s acc | return acc.concat(s.split("\n").filter(q => q != '')) :}

#func "join" {: arr sep | return arr.join(sep) :}

func "format_summary" { s |
  return (map @s  { line |
    code := get @line 1
    name := get @line 0
    return (+ (if (@code == 0) { "  OK"} else { "FAIL"}) " : " @name)
  } | join "\\n")
}

react @k.exitcode {

  print "found tests" @t2
  //t2 := apply {: t | return t.sort() :} @tests
  t2 := std.sort @tests

  summary := map(@t2) { test|
    print "============= running test" @test
    r: os.spawn 'clon' 'r' @test  // stdio='inherit'
    //react @r.stdout (func { |msg| print @msg })

    react @r.stdout {: msg | process.stdout.write(msg) :}
    react @r.stderr {: msg | process.stdout.write('stderr:'+msg) :}
    k: react @r.exitcode { code |
      print "------------- finished test" @test "exitcode" @code
      //if (@code > 0) { apply {: process.exit(1) :} }//{ apply {: console.log('throwing error'); throw "error" :} }
    }
    return (list @test @r.exitcode)// @k.output)
  }
  printed: print ("summary is\\n" + (format_summary @summary))

  apply {: code | console.log('finished, code',code); process.exit( code ) :} 
     (apply {: s | return s.find( r => r[1] != 0 ) ? 1 : 0 :} @summary) 
     @printed.output

  //print( "   ", x + 1, sin(x) )
}