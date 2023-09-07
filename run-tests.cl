#!./cl-tool r
import os = "std/os.cl"

#print "running tests"
tests := reduce_events (k: os.spawn "find" "tests.official" "-name" "main.cl") [] {: s acc| return acc.concat(s.split("\n").filter(q => q != '')) :}

react @k.exitcode (func {
  print "found tests" @tests
  map @tests (func { |test|
    print "running test" @test
    r: os.spawn 'cl-tool' 'r' @test
    return @r.exitcode
  })
})