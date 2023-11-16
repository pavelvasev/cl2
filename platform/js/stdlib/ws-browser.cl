// вебсокеты для браузера

// todo объединить это как-то с ws.cl
// вероятно на уровне препроцессинга исходника
// идея - нам нужен какой-то очевидный препроцессор в духе Си
// % ifdef @browser { jsws = global } { }
// но мб и бесполезно - там on а тут addEventListener

import std="std"

// клиентский процесс
// вероятно парсинг из и в json тут лишние - это можно сделать внешним коммуникатором
process "client" {
  in {
    url: cell
    input: channel // канал отправки сообщений
  }
  
  output: channel
  error: cell // сообщения об ошибках
  ready: cell false // признак что присоединились

  h: state

  react @url {: url |
    if (self.h) self.h.close()
    //console.log("connecting to ",url)
    try {
      self.h = new WebSocket( url )
    } catch (err) {
      console.error("inside catch of WebSocket",err)
      self.error.submit( err )
    }

    self.h.addEventListener('open', () => self.ready.submit(1))
    self.h.addEventListener('error', (err) => {
       //console.error("ws error",err)
       self.error.submit(err)
       })
    self.h.addEventListener('close', (err) => {
      //self.error.submit(err)
      })

    self.h.addEventListener("message", (data) => {
      let msg = JSON.parse( data.data )
//      console.log("client receive data=",data,"parsed=",msg)
      output.submit( msg )
    })
  :}
 
  react @input {: data |
//    console.log("client sending data=",data)
    if (!self.h) {
      console.error("client have input but not connected. dropping.")
      return
    }
    try {
      self.h.send( JSON.stringify(data) )
    } catch (err) {
      self.error.submit( err )
    }
  :}

}

////////////////////////////////////
