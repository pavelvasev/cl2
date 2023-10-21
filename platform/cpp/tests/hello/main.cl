//print "hello"

alfa: channel type="float"

beta: channel type="float"

bind @alfa @beta

react @beta {: val |
  std::cout << "hello" << val << std::endl;
:}

react @alfa {: val |
  std::cout << "alfa " << val << std::endl;
:}

init {:
  alfa.submit(42);
  alfa.submit(100);
:}