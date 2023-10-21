import * as path from 'node:path';

export function init( st ) {

	let space = st.space

	// добавляет "экпортируемую сущность" в текущий модуль (пока ток в форме функции)
	// ну на самом деле тут генератор текста просто...
	// плюс добавлятор в state.current.exported
	// немного неясно, а зачем тут генерировать коды..? типа мы по разному можем это сделать?
	// и решили решать это тут?
	space.register_item = ( id, state, strs2 ) => {
		//console.log('register_item: ',id,'state.tree_parent_id=',state.tree_parent_id, state.struc)
		let strs = []
		//let export_flag = state.struc_parent_id == null && (state.dir == '' || state.dir == './') ? "export " : ""
		let export_flag = "";
		// todo совместить расчет export_flag с тем что в compute.js для функций
		//console.log("register_item: id=",id," export_flag=",export_flag,"state.dir=",state.dir)
		let s = `${export_flag}class ${id} : public cl2::object`
		strs.push(`/// type ${id}`,s,"{")
		strs.push( strs2 )
		strs.push("};")
		
		space.register_export( `create_${id}`, state )
		return strs
	}

	// а это надо?
	space.register_export = ( id, state ) => {
		if (state.tree_parent_id == null) {
			state.current.exported ||= []
			state.current.exported.push( id )
		}
	}

	space.get_export_flag = ( state ) => {
		return "" // пока без етого
		let export_flag = state.struc_parent_id == null && (state.dir == '' || state.dir == './') ? "export " : ""		
		return export_flag
	}

	// добавляет функцию
	/*
	space.register_func = ( id, state, args_str, body_str ) => {
		//console.log('register_item: ',id,'state.tree_parent_id=',state.tree_parent_id, state.struc)
		let strs = []
		let export_flag = state.struc_parent_id == null && (state.dir == '' || state.dir == './') ? "export " : ""
		// todo совместить расчет export_flag с тем что в compute.js для функций
		//console.log("register_item: id=",id," export_flag=",export_flag,"state.dir=",state.dir)
		let s = `${export_flag}function ${id}( ${args_str} )`
		strs.push( s )
		strs.push( strs2 )
		strs.push( body_str )
		
		if (state.tree_parent_id == null) {
			state.current.exported ||= []
			state.current.exported.push( id )
		} else {
			//console.log("skip export id",id,"due to state.tree_parent_id",state.tree_parent_id)
			//console.trace()
		}
		return strs
	}
	*/	

	let module_var_names = {} // srcfile -> name
	let module_counter = 0

	function path_to_var( srcfile ) {
		let p1 = path.basename(srcfile,".cl")
		let p2 = p1.replaceAll( /[^a-z0-9\-\_]/gi,"_")
		let p3 = p2 + "_" + (module_counter++).toString()
		return p3
	}

	space.register_import_outer = ( src, resolved_file ) =>
	{
		let module_var_name = path_to_var( resolved_file )
		module_var_names[ resolved_file ] = module_var_name
		let strs = []
		return [ `import * as ${module_var_name} from '${src}'` ]
	}

    // вносим модуль в списки импортов. один и тот же модуль 2 раза вносить не надо.
	space.register_import = ( tgt, srcfile, substate,code ) => {
		let strs = []
		/// используется метод https://habr.com/ru/articles/583130/
		//let names = Object.keys(substate.current).map(n => `create_${n}`).join(",")
		substate.current.exported ||= []
		//console.log('substate.current.exported=',substate.current.exported,srcfile)
		let names = substate.current.exported.join(",")

		let module_var_name = path_to_var( srcfile )
		module_var_names[ srcfile ] = module_var_name
		
	    let exportvar = `var ${module_var_name} = {${names}}`
	    //let exportvar = `var ${module_var_name} = self`
		// let js_import_path = "./" +  src + ".js"
		// strs.push(`import * as ${tgt} from '${js_import_path}'`)
		strs.push( "////////////////////////////////////////" )
		strs.push( `//////////////////////////////////////// module from ${srcfile}` )
		strs.push( "////////////////////////////////////////" )
		strs.push( `namespace ${module_var_name} {`)
		strs.push( code )
		strs.push( "}")
		strs.push( `//////////////////////////////////////// finished module from ${srcfile}` )		
		
		return strs
	}

	// используем модуль из внесенных ранее в список
	space.register_import_use = ( tgt, srcfile, substate ) => {

		let module_var_name = module_var_names[ srcfile ]

		let exportvar = `namespace ${tgt} = ${module_var_name}`

		let strs = []
		strs.push( `//////////////////////////////////////// using module ${srcfile} as ${tgt}` )
		strs.push( exportvar )
		
		return strs
	}	

}
