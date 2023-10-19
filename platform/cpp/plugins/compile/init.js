import { access, constants } from 'node:fs/promises';

import * as fs from 'node:fs';
import * as path from 'node:path';

export function init( state, tool ) {

	tool.add_command( "compile", (file="main.cl") => {

		function changeExtension(file, extension) {
		  const basename = path.basename(file, path.extname(file))
		  return path.join(path.dirname(file), basename + extension)
		}
		
		// надо полный путь а то получаются короткие имена вида some/init.js и оно начинает думать что some это имя модуля
		// F-SINGLE-MODULES-DIR
		let project_dir = path.dirname( file )
		let config_file = path.resolve( project_dir + "/clon.mjs" )

		let mmm0 = access(config_file, constants.R_OK)
		let config = {}
		let mmm = mmm0.then( () => {
			return tool.load_module( config_file,state,"",project_dir ).then( conf => {
				//console.log("loaded conf",conf)
				tool.config = conf
				config = conf
				//config.output_dir ||= path.dirname( path.resolve(file) ) // todo мб не здесь
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

		// F-EMBED-RUNTIME		
		mmm = mmm.then( () => {
			tool.prepend_global_code(['// clon runtime',`#include "cl2.h"`])
		})

		let compiled = mmm.then( () => tool.compile_file_p( file, state ))

		/// сохранение файлов
		// console.log("config.output_dir=",config.output_dir, config,config_file)
		

		let out_file = file + ".cpp"

		let nodejs = compiled.then( k => {
			let code = tool.gen_full_code( k.code )

			if (config.output_dir)
			    out_file_mjs = path.resolve( path.join( config.output_dir, path.basename( file ) )) + ".mjs"

			return new Promise( (resolve,reject) => {
				fs.writeFile( out_file, code,(err) => {
			  	if (err) console.log(err)
			  	console.log("done: ",file,"-->",out_file_mjs)
			    resolve( out_file_mjs )
			  } )
			})	  
		})
		
		/// но вернуть нам надо имя файла которое затем смогут запускать
		/// вернем нодовый вариант

		return Promise.all( [nodejs, browser ]).then( (values) => values[0])

	} )
	tool.add_command("c", tool.get_command("compile"))

}
