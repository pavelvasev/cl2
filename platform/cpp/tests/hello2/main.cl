//print "hello"

process "printer" {
 in {
   msg: channel type="std::string"
 }
 react @msg {: x |
   std::cout << x;
   return 0;
 :}
}

x: printer "hello"
y: printer "world"

z: cell "star" type="std::string"
bind @z @y.msg
//bind @x.msg @y.msg