// вебсокеты для nodejs

import jsws="js:ws" std="std"

// адаптер для сервера для работы с клиентами
process "adapter" {
  in {
    conn: const
    input: channel
  }

  output: channel

  init {:
    //console.log("cc initing with: conn")
    conn.on("message", (data) => {
      let msg = JSON.parse( data )
      //console.log("cc client input data=",data,"parsed=",msg)
      output.submit( msg )
    })
  :}

  react @input {: data |
    //console.log("cc client sending data=",data)
    self.conn.send( JSON.stringify(data) )
  :}
}

process "server" {
  in {
    port: cell
  }

  h: state
  
  connection: channel

  react @port {: port |
    if (self.h) self.h.close()
    // console.log("initing server ",port)
    
    self.h = new jsws.WebSocketServer({
      host: "0.0.0.0",
      port: port,
      perMessageDeflate: false,
      skipUTF8Validation: true,
      maxPayload: 200*1024*1024
    })
    
    self.h.on('listening', () => {
      console.log('ws server started at',self.h.address())
    })
    
    self.h.on('connection', (ws) => self.connection.submit( ws ) );
  :}
}

process "client" {
  in {
    url: cell
    input: channel
  }
  
  output: channel
  open: cell false

  h: state

  react @url {: url |
    if (self.h) self.h.close()
    //console.log("connecting to ",url)
    self.h = new jsws.WebSocket( url )

    self.h.on('open', () => self.open.submit(1))

    self.h.on("message", (data) => {
      let msg = JSON.parse( data )
      //console.log("cc client input data=",data,"parsed=",msg)
      output.submit( msg )
    })
  :}

  react @input {: data |
    console.log("client sending data=",data)
    if (!self.h) {
      console.error("client have input but not connected. dropping.")
      return
    }
    self.h.send( JSON.stringify(data) )
  :}

}

////////////////////////////////////
