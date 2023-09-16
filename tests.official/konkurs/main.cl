/*
func "mapArrayToHashByKey" { array key |
  h := reduce (or @array []) (dict) { item acc|
    // ето не o(n)
    // return (dict **@acc **( list (get @item @key) @item))
    set @acc (get @item @key) @item
  }
  return (dict **h **( list (+ "_" @key "s") (keys @h)))
}
*/

//// как-то бы рекурсивно попробовать.. но если дублировать словарь то это не o(n)
// попробуем промепить и в словарь

/* рабочий вариант
func "mapArrayToHashByKey" { array key |
  h := map (@array or []) { item | return (list (get @item @key) @item) }
        | filter { v | return ((get @v 0) != null) }
        | list_to_dict
  return (concat @h (list (list (+ "_" @key "s") (keys @h)) | list_to_dict))
  #return (dict **@h **(dict(list (+ "_" @key "s") (keys @h) )))
}
*/

func "mapArrayToHashByKey" { array key |
  h := map( @array or [] ) { item | return (list( get(@item,@key), @item )) }
       | filter { v | return (get(@v,0) != null) }
       | list_to_dict
  return (concat(@h, list( list( +("_",@key,"s"), keys(@h) ) ) | list_to_dict))
}

//////////// тест

data := apply {: return [
  {
    id: 1,
    age: 25,
    address: {
      city: "New York",
      zipCode: 10001,
    },
    name: "John",
    surname: "Doe",
  },
  {
    id: 2,
    age: 30,
    address: {
      city: "Los Angeles",
      zipCode: 90001,
    },
    name: "Jane",
    surname: "Smith",
  },
  {
    id: 3,
    age: 30,
    address: {
      city: "Los Angeles",
      zipCode: 90001,
    },
    name: "Janett",
    surname: "Smith",
  },
  {
    id: 4
  }
] :}

print "data=" @data 
print "result=" @result

result := mapArrayToHashByKey @data "age"

assert (arrays_equal (get @result "_ages") ['25','30'])