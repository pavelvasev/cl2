// тестируем модуль ws

import std="std" ws="std/ws.cl"

///////// сервер
// принимает сооощения от клиента, умножает на 10 и отправляет обратно

srv: ws.server 8001

react @srv.connection { conn |
  print "see server client"

  ws.adapter @conn | * 10 | ws.adapter @conn

/* другой вариант:
  cli: adapter @conn

  print "HH in=" @cli.output
  react @cli.output {: data |
    cli.input.submit( data * 10 )
  :}*/
}

/////////////// клиент
// посылает сообщения серверу, получает ответные и печатает их
// std.timer посылает счетчик от 0 и далее раз в секунду

cli: ws.client "http://localhost:8001" (std.timer)

react @cli.output {: d |
  console.log( "----> client got data",d )
:}
