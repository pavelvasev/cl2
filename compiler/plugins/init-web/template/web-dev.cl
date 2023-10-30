#!/usr/bin/env -S clon run

print "starting web dev"

import os="std/os.cl"

apply {
   k1: os.spawn "clon" "compile" stdio="inherit"
   return @k1.exitcode
}
================

// запускаем лайв-сервер который обновляет веб-страницу при изменении файлов
// проект https://github.com/tapio/live-server
os.spawn "npx" "--yes" "live-server" stdio="inherit"
// другой вариант: https://vitejs.dev/guide/
//os.spawn "npx" "--yes" "vite" "--open" stdio="inherit"
// но тогда сказать npm init; npm install vite

// запускаем перекомпиляцию при изменении файлов
//os.spawn "clon" "watch" stdio="inherit"

print "entering wait state"
import std="std"
react (os.watch ".") { val |
     print "watch reaction! " @val
     return (if (apply {: return val.filename.endsWith(".cl") :}) {
       print "watch reaction - recompile! " @val
       k: os.spawn "clon" "compile" stdio="inherit"
       // как-то ловить k.stderr и писать в файл
       // а html пусть его показывает
       return @k.exitcode
     } else 0)
}