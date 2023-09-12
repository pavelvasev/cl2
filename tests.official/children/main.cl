# тестируем обработку вложенных объектов

obj "element" {
  in {
    text: cell
    bold: cell false
    size: cell 1
    ch&: cell
  }

  x := apply @ch @self
  # это было бы шикарно - получить тут список элементов созданных. и удобно.
  # однако там могут быть динамические создаватели типа repeater и что с ними делать.
  # subelements := apply @ch @self

  //print @self.children
  //init {
    //print @self.children
  //}
  
  // идея - можно класть в self.name ячейку с содержимым - функцией. тогда будут реакции вполне себе работать.
  // т.к. смогут "биндиться" к ячейке исходной (содержащей функцию).
  func "show" { prefix |
    print @prefix "text=" @text
    print @prefix "bold=" @bold
    print @prefix "size=" @size
    print @prefix "children=" (map @self.children {: c | return c.toString() :})
    map @self.children {: c | if (c.show) c.show( prefix + '-' ); else console.log('c have no-show',c + '') :}
    //{ |c| apply @c.show }
  }
  /*
  func "get" { prefix |
    return (list @text (map @self.children { c | return (apply @c.get) }))
  }
  */
}

/*
func "info" { elem prefix |
   return (list @elem.text (map @elem.children { c | return (apply @info @c (@prefix + '-')) })) 
}
*/
func "info" { elem prefix newline|
   return (+ @prefix @elem.text @newline (map @elem.children { |c|
      return (apply @info @c (@prefix + '-') @newline) } | join "") )
}

e2: element "privet" {
  element "kak"
  element "dela" {
    element "tvoi?" bold=true {
      element "otvet: horosho!"
      element "otvet: a kak tvoi?"
    }
  }
}

//apply @e.show
# apply {: e2.show('') :}
print (apply @info @e2 '' '\\n')
print (apply @info @e2 '' '%')
assert ((apply @info @e2 '' '%') == "privet%-kak%-dela%--tvoi?%---otvet: horosho!%---otvet: a kak tvoi?%")