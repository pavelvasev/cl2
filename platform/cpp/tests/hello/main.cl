//print "hello"

alfa: channel type="float"

react @alfa {: val |
  std::cout << val;
:}