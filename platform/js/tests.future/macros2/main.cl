// F-COMPILER-LANG

/*
form "blk" {: obj state|
  return obj.params[0]
:}
*/

% {
  item := dict a=(quote {
    in { name: cell }
    print "hello from " @name
  })

  item2 := dict a=(quote { print "feature b" })

  features := list @item @item2
  
  func "get_features" {: features key |
    return features.map( f => f[key] ).filter( rec => rec )
  :}
  
  func "some" { arg | return (@arg + 15) }
  
  func "privetik" { arg | return ("print 'privetik' " + @arg) }
}

process "alfa" {
  in {
    input: cell
  }
  print "alfa" @input

  // % get @item "a"
  // % map @features {: f | return f.a :} | filter {: f | return f :}
  // % apply {: features | return features.map( f => f.a ).filter( rec => rec ) :} @features
  % get_features @features "a"
}

alfa "input" "name15"

print "some is " (% some 10)

% privetik 33
