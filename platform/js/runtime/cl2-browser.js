// Модуль совместимости с браузерами.

// setImmediate нету в браузере, поэтому делаем свой https://learn.javascript.ru/setimmediate
// https://groups.google.com/a/chromium.org/g/blink-dev/c/Hn3GxRLXmR0/m/XP9xcY_gBPQJ
// ну или можно просто setTimeout
// либо вообще зарефакторить и уйти от immediate на подумать - это же для логического времени.

// F-JOIN-NODEJS-BROWSER-RUNTIME - решено пока и для ноды и для веба одинаковые файлы иметь
// чтобы мозги себе не парить. Поэтому важно здесь делать код такой который бы и нода
// переварила.

if (typeof window === "object") {
  if (!window.setImmediate) window.setImmediate = function(func) {
    new Promise(function(resolve){
        resolve();
    }).then(func);
  };
}