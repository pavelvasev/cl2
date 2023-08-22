// setImmediate нету в браузере, поэтому делаем свой https://learn.javascript.ru/setimmediate
// https://groups.google.com/a/chromium.org/g/blink-dev/c/Hn3GxRLXmR0/m/XP9xcY_gBPQJ
// ну или можно просто setTimeout
// либо вообще зарефакторить и уйти от immediate на подумать - это же для логического времени.

if (!window.setImmediate) window.setImmediate = function(func) {
    new Promise(function(resolve){
        resolve();
    }).then(func);
};
