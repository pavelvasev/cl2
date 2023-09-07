import os="std/os.cl"

p: os.spawn "cl-tool" "r"
//| reduce '' {: val acc | acc + val :}
//arr := gather_events @p.output
arr := reduce_events @p.stdout '' {: val acc | process.stdout.write('>> ' + val); return acc+val :}

react @p.exitcode {:
  //let str = arr.get().join('')
  let str = arr.get()
  if (!console.assert( str.indexOf("30 60 12") >=0 )) {
    throw "error"
  }
  console.log('test complete')
:}

// assert (includes @stdout "30 60 12")
// на будущее
// collect_stdout "program" | assert {: s | s.indexOf() >=0 .. :}

import t = "std/test.cl"
s := t.run "main.cl"
//t.assert {: s | s.indexOf("30 60 12") >= 0 :} @s
t.assert (str.contains @s "30 60 12")