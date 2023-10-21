//print "hello"

alfa: channel type="float"

beta: channel type="float"

bind @alfa @beta

/*
react @alfa {: val |
  std::cout << val;
:}
*/