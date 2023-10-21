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

process "finer" {
 in {
   msg: channel type="std::string"
 }
 
 output: channel type="std::string"

 react @msg {: x |
   self.output.submit( "{{{" + x + "}}}" );
   return 0;
 :}
}

process "fine_printer" {
 in {
   msg: channel type="std::string"
 }
 printer (finer @msg)
}


x: fine_printer "hello"
y: printer "world"

z: cell "star" type="std::string"
bind @z @y.msg
//bind @x.msg @y.msg