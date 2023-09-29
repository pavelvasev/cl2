import os="std/os.cl"

content := os.read "clon.mjs"
os.write "clon.mjs" (+ @content "\n" "modules['" @ref_id "'] = " @ref)

url := get (os.argv) 1

ref_id := get @ref_h 0
ref := get @ref_h 1

ref_h := apply {: url | 
  //console.log("ref-h url=",url)
  if (url.endsWith(".git")) {
    let id = url.split("/").pop().split(".")[0]
    return [id,`{ git: '${url}' }`]
  } else {
    let id = url.split("/").pop()
    return [id, `{ dir: '${url}' }`]
  }
:} @url

================

os.spawn "clon" "nest" stdio="inherit"