//print "hello"

process "printer" {
 in {
   msg: channel
 }
 react @msg {: x |
   cout << x;
 :}
}

printer "hello"