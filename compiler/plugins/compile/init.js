import { access, constants } from 'node:fs/promises';

import * as fs from 'node:fs';

export function init( state, tool ) {

	tool.add_command( "compile", (file="main.cl") => {
		//let file = process.argv[2] || "main.cl";
		// добавляя полный путь, мы обеспечиваем возможность внутрях вычислить текущий каталог из него и тогда хорошо отрабатывает загрузчики внутренние
		file = "file://" + file // Vrungel.add_dir_if( file, process.cwd() + "/" );

		// extension should include the dot, for example '.html'

		function changeExtension(file, extension) {
		  const basename = path.basename(file, path.extname(file))
		  return path.join(path.dirname(file), basename + extension)
		}
		//let out_file = changeExtension(file,".js")
		let out_file = file.slice(7) + ".js"

		//console.log("starting compiling file. state.env=",state.env)

		// мы переходим в режим компиляции. надо загрузить модули проекта.
		// project.cl?
		/*
		let mmm = tool.get_module_config(".").then ( conf => {
			conf.modules ||= {}
			let to_load = []
			for (let key in conf.modules) {
				let dir = tool.get_module_dir(x)
				state.import_map[ key ] = dir
				to_load.push( dir )
			}
			return tool.load_modules( to_load )
			//let user_modules = Object.values( conf.modules || {} ).map( x => tool.get_module_dir(x) )
			//return tool.load_modules( user_modules )
		})		
		*/
		let mmm = tool.load_modules( ".",state )

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
