# тестируем обработку вложенных объектов

obj "element" {
  in {
    text: cell
    bold: cell false
    size: cell 1
    ch&: cell
  }
  
  tree: tree_node

  x := apply_children @ch
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
    print @prefix "children=" (map @self.tree.children {: c | return c.toString() :})
    map @self.tree.children {: c | if (c.show) c.show( prefix + '-' ); else console.log('c have no-show',c + '') :}
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
// внешний обход
func "info" { elem prefix newline|
   + @prefix 
     @elem.text
     @newline
     (map @elem.tree.children { |c|
          info @c (@prefix + '-') @newline
         } | join "")
         
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

print "chch=" (map @e2.tree.children {: s | return `@@@@@ ${s.$cl_id}` :})

//print "chch=" (map @e2.tree.children {: s | console.log('******************************** map item call',CL2.get_title(s)); return `@@@@@ ${s.$cl_id}` :})
//print "e2=" @e2 // (apply {: s | return s+'' :})