import std="std/std.cl"

q: channel

react (std.timer) {:
  console.log("tm begin")
  q.emit()
  q.emit()
  console.log("tm-end")
:}

react @q {: console.log("q-react") :}