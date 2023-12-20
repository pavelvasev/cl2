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
		let load_config_p = mmm0.then( () => {
			return tool.load_module( config_file,state ).then( conf => {
				//console.log("loaded conf",conf)
				tool.config = conf
				config = conf

				// хорошо бы сделать эту штуку абсолютной..
				//if (config.output_dir) config.output_dir = path.resolve( project_dir, ...

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
		let mmm = load_config_p.then( () => {
			let file_p = "file://" + path.resolve( path.join(tool.platform_dir,"./runtime/cl2.js"))
			return fetch( file_p ).then( r => r.text() ).then( content => {
				tool.prepend_global_code(['// clon cl2.js runtime',content])

				// todo ей не место тут по логике
				tool.prepend_global_code( [`let self={};`] )
			})
		})
		// встроим пока тоже и браузер, для упрощения
		// F-JOIN-NODEJS-BROWSER-RUNTIME
		// хотя может стоит и разделить. тогда можно нодовый вариант делать с shebang
		// и +x ключик ставить - запускайте пожалуйста.
		mmm = mmm.then( () => {
			let file_p = "file://" + path.resolve( path.join(tool.platform_dir,"./runtime/cl2-browser.js"))
			return fetch( file_p ).then( r => r.text() ).then( content => {
				tool.prepend_global_code(['// clon cl2-browser.js runtime',content])
			})
		})

		let compiled = mmm.then( () => tool.compile_file_p( file, state ))

		/// сохранение файлов
		// console.log("config.output_dir=",config.output_dir, config,config_file)
		

		let out_file = file + ".js"
		let out_file_mjs = file + ".mjs"

		// F-MK-OUTPUT-DIR - создать перед компиляцией целевой каталог, указанный в output_dir
		// как-то оно успевает создать папку до компиляции..
		let output_dir_ready_p = load_config_p.then( () => {
			if (config.output_dir) {
				//let targetDir = path.resolve( path.join( config.output_dir ))
				//console.log("mkdir sync config.output_dir=",config.output_dir)
				fs.mkdirSync(config.output_dir, { recursive: true });			
				//out_file = path.resolve( path.join( config.output_dir, path.basename( file ) )) + ".js"
				//out_file_mjs = path.resolve( path.join( config.output_dir, path.basename( file ) )) + ".mjs"
			}
		}) 

		let nodejs = compiled.then( k => {
			let code = tool.gen_full_code( k.code )

			if (config.output_dir)
			    out_file_mjs = path.resolve( path.join( config.output_dir, path.basename( file ) )) + ".mjs"

			return new Promise( (resolve,reject) => {
				fs.writeFile( out_file_mjs, code,(err) => {
			  	if (err) console.log(err)
			  	console.log("done: ",file,"-->",out_file_mjs)
			    resolve( out_file_mjs )
			  } )
			})	  
		})

		let browser = compiled.then( k => {
			let code = tool.gen_full_code( k.code )

			if (config.output_dir)
				out_file = path.resolve( path.join( config.output_dir, path.basename( file ) )) + ".js"

			return new Promise( (resolve,reject) => {
				fs.writeFile( out_file, code,(err) => {
			  	if (err) console.log(err)
			  	console.log("done: ",file,"-->",out_file)
			    resolve( out_file)
			  } )		  
			})	  
		})

		/// но вернуть нам надо имя файла которое затем смогут запускать
		/// вернем нодовый вариант

		return Promise.all( [nodejs, browser ]).then( (values) => values[0])

	} )
	tool.add_command("c", tool.get_command("compile"))

}
