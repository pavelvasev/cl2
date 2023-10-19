let js_modules = [
 "compiler/js-compiler.js",
 "forms/forms.js",
 "compute/compute.js",
 "bundle-2/bundle-2.js", 
 "import/import-cl.js",
 "../stdlib/init.js",
 "../stdlib/defaults/init.js", 
 "run/init.js",
 "compile/init.js",  
 ]

import * as path from 'node:path';

export function init( state, tool ) {
    let mmm = tool.load_modules( js_modules.map( x => path.join(tool.platform_dir,"plugins",x) ), state)
    return mmm
}