// -----------------------
// F-LIST-COMM преобразование списков в события и обратно

// submit_events @list -> channel записывает все элементы списка в канал
obj "submit_events" {
  in {
    input: cell
  }
  output: channel
  react @input {: arr |
    arr.map( v => output.submit( v ) )
  :}
}

// gather_events @channel -> list - собирает события из канала в список
obj "gather_events" {
  in {
    input: channel
  }
  output: cell []
  react @input {: val |
    let arr = output.get();
    arr.push( val ); 
    output.set( arr.slice(0) ) 
    // slice(0) конечно это ваще.. но иначе change-проверка не поймет смены..
    // а даже если здесь поймет то дальше не поймет.. это надо как-то особо обработать..
    // мб идея - поле для массива с его версией.
  :}
  // тут кстати та же проблема - массив то тот же самый, и события changed не будет
}

// reduce_events @channel acc_init func -> acc
// собирает значения из канала и применяет к ним функцию func(channel_val, acc).
// но вообще странно, надо ли это.. это же типа как реакция в целом то получается,
// просто особой формы.. да и просто reduce нам тоже надо..
obj "reduce_events" {
  in {
    input: channel
    init: cell
    f: cell
  }
  // надо init сделать промисой. тогда все ок будет. или параметром даже лучше. и f параметром. т.е. требовать наличия.
  // это кстати будет норм, т.к. в таск-режиме это обернется в промису
  acc: cell
  bind @init @acc

  output: cell
  bind @acc @output

  react @input {: value |
    let new_acc = f.get().call( this, value, acc.get() )
    // привет, тут промиса будет от кофункций. и что делать?
    if (new_acc instanceof CL2.Comm) {
      new_acc.once( val => {
        acc.set( new_acc )
        // надо какой-то режим буферизации.. чтобы может быть react функцию просто не вызывал
        // пока мы тут не закончим.. а буферизировал скажем.. todo
      })
    }
    else
      acc.set( new_acc )
  :}
}