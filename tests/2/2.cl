import std="std.cl" dom="dom.cl"
// вот как мне не хватает символов. типа import %std
// они мне нужны еще вот когда: channel %alfa %beta

obj "foo" {
//    in {
      alfa: cell 100
      sigma: cell "not-inited"
      gamma: cell 2 
      beta: cell 3
//    }

      std.print "alfa is" @alfa "sigma is" @sigma "gamma is" @gamma
}

//print "gamma is" @teta

foo alfa=(std.add @beta 10 (std.counter (std.timer interval=500))) sigma=(std.counter (std.timer) 111)
// interval=1250

//foo alfa="hi" sigma=14 gamma=@teta
//foo alfa=(add @beta 10) sigma=14 gamma=@teta
//foo alfa=(add @beta 10) sigma=(timer) gamma=@teta
let beta=15 teta=22

dom.element tag="button"