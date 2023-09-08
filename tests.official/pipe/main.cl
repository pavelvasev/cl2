
res := apply {{ return 10 }} | apply {{ x | return (2 * @x) }}
print "res is" @res