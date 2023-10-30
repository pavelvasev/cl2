// F-COMPILER-LANG

% func "some" {: arg |
    console.log("privet called",arg)
    return "privet"
  :}

% {
 a:= 5
}

// % some @a

process "alfa" {
  in {
    input: cell
  }
  print "alfa" @cell
}

alfa (% some @a)