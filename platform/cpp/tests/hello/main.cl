//print "hello"

process "printer" {
 in {
   msg: channel
 }
 react @msg {: x |
   std::cout << x;
 :}
}

printer "hello"