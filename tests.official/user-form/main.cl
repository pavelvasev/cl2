// тестируем возможность добавления форм F-USER-FORM

form "foo" {: obj state |
  return { main: ["// hello from foo","console.log('foo is'," + (obj.params[0] || 333) + ")"] ,bindings: [] }
:}

print "hello!"

foo 44

// todo добавить бы assert какой-то.. пусть foo ячейку создает что ли..