import os="std/os.cl"

content := os.read "clon.mjs"
os.write "clon.mjs" (+ @content "\n" "modules['" @ref_id "'] = " @ref)

url := get (os.args) 0

ref_id := get @ref_h 0
ref := get @ref_h 1

ref_h := apply {: url | 
  if (url.endsWith(".git")) {
    let id = url.split("/").split(".")[0]
    return [id,`{ git: '${url}' }`]
  }
  let id = url.split("/").pop()
  return [id, url]
:} @url
