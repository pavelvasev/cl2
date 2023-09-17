import { access, constants } from 'node:fs/promises';

import * as fs from 'node:fs';
import * as path from 'node:path';

export function init( state, tool ) {

	tool.add_command( "compile", (file="main.cl") => {

		function changeExtension(file, extension) {
		  const basename = path.basename(file, path.extname(file))
		  return path.join(path.dirname(file), basename + extension)
		}
		let out_file = file + ".js"
		
		// надо полный путь а то получаются короткие имена вида some/init.js и оно начинает думать что some это имя модуля
		let config_file = path.resolve( path.dirname( file ) + "/init.js" )

		let mmm0 = access(config_file, constants.R_OK)
		let mmm = mmm0.then( () => {
			return tool.load_module( config_file,state ).then( conf => {
				tool.config = conf
				state.import_map = conf.import_map //{...state.space.default_import_map, ...conf.import_map}
			}).catch( err => {
				console.error("compile: error during load_module:",config_file,err)
				throw err
			})
		}).catch( () => {})

		mmm0.catch( err => { 
			tool.config = {} 
			return true 
		})

		// hack
		
		mmm = mmm.then( () => {
			let file_p = "file://" + path.resolve( path.join(tool.clon_dir,"./runtime/cl2.js"))
			return fetch( file_p ).then( r => r.text() ).then( content => {
				tool.prepend_global_code(['// clon cl2.js runtime',content])
			})
		})

		return mmm.then( () => tool.compile_file_p( file, state )).then( k => {
			let code = tool.gen_full_code( k.code )

			return new Promise( (resolve,reject) => {
				fs.writeFile( out_file, code,(err) => {
			  	if (err) console.log(err)
			  	console.log("done: ",file,"-->",out_file)
			    resolve( out_file)
			  } )		  
			})	  
		})

	} )
	tool.add_command("c", tool.get_command("compile"))

}
