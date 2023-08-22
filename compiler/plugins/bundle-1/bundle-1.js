export function setup( state ) {

	let space = state.space

	space.register_item = ( id, state, strs2 ) => {
		let strs = []	
		let s = `export function create_${id}( initial_values )`
		strs.push(`/// type ${id}`,s,"{")
		strs.push( strs2 )
		strs.push("}")
		return strs
	}

	space.register_import = ( tgt, src ) => {
		let strs = []
		let js_import_path = "./" +  src + ".js"
		strs.push(`import * as ${tgt} from '${js_import_path}'`)
		return strs
	}

}
