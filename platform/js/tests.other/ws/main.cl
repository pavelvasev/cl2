// тестируем модуль ws
////////////////////////////////////

import std="std" ws="std/ws.cl"

srv: ws.server 8001

react @srv.connection { conn |
  //console.log("server see client")
  print "see server client"
  return 1

  ws.adapter @conn | * 10 | ws.adapter @conn

/*
  cli: adapter @conn

  print "HH in=" @cli.output
  react @cli.output {: data |
    cli.input.submit( data * 10 )
  :}*/
}

cli: ws.client "http://localhost:8001" (std.timer)

//print "cli output = " @cli.output
react @cli.output {: d |
  console.log( "----> client got data",d )
:}