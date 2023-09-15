import { access, constants } from 'node:fs/promises';

import * as fs from 'node:fs';

// todo это не install а это "загрузить модули". ибо make install он устанавливает проект в систему.
// а npm install тянет модули. но это неправильно.
export function init( state, tool ) {

	tool.add_command( "install", () => {

		return tool.load_module_config( ".", state ).then( conf => {
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
	tool.add_command("i", tool.get_command("install"))

}
