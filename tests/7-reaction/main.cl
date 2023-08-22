import std="std/std.cl"

//obj "foo1" {
// x: cell

 let a = (std.timer)
     b = (react (std.timer interval=500) {: return 3 :})
     c = (std.counter (std.timer))
 react @a.assigned {: q | console.log('tmr1',q) :}
 react @b.assigned {: q | console.log('tmr2',q) :}
 react (react (std.timer interval=500) {: return 4 :}) {: q | console.log('tmr2_2',q) :}
rr: react @c {: q | console.log('tmr3',q ); return q :}
//}

foo4: func {: x | console.log("foo4 called, x=",x) :}
react @rr @foo4

//foo1
