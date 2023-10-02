/* тестируем что
   1 значения указанные константой как начальные для канала - передаются.F-CHANNEL-INIT-CONST
   2 и что мы своевременно ловим результат output-каналов.
*/

obj "some" {
  in {
    input: channel
  }
  output: channel

//  react @input { val | print "val come! " @val }
  react @input {: val |
    console.log("val come 2!",val)
    console.log("submitting to output")
    output.submit( val )
  :}
}

// первый вариант - отрабатываем output у процесса
print "=========== case 1"
s: some 10
print "s=" @s.output
x := 0
react @s.output {: val | console.log("see s value",val); x.submit(val) :}

assert (@s.output == 10)

======
// второй вариант - кладем output процесса в ячейку

print "=========== case 2"
v:=some 20
print "v=" @v

assert (@v == 20)
