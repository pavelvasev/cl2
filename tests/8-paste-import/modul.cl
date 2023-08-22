//import FOO="./foo.js"

import FOO="./foo.js"

// это не работает из-за текущего механизма сборки
// paste "import * as FOO from './foo.js'"
// ну идея:
// global-js "import * as FOO from './foo.js'"
// или 
// global-paste "import * as FOO from './foo.js'"
// и типа уже на страх и риск пользователя

obj "foo" {
  paste "console.log(FOO.f1(123))"
}
