//////////// решение задачи - функция mapArrayToHashByKey

func "mapArrayToHashByKey" { array key |
  h := map (@array or []) { item | list (get @item @key) @item }
        | filter { v | (get @v 0) != null }
        | dict
  return (concat @h (dict (+ "_" @key "s") (keys @h)))
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

==============
assert (arrays_equal (get @result "_ages") ['25','30'])
assert ((get (get @result '30') 'name') == 'Janett')