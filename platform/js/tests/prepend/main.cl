// глючили пайпы. это проверка.

alfa := [1,2,3]
#beta := prepend @alfa 10
#print "beta=" @beta

teta := or @alfa [] | prepend (dict a=(dict b=7))
print "teta=" @teta

assert (apply {: t | return t[0].a.b == 7 :} @teta)