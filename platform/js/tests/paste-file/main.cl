print "main"
======
paste_file "p1.cl" "p2.cl"
x := foo

assert (@x == 15)