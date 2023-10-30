import * as path from 'node:path';

export function init( state, tool, conf ) {
	//console.log("conf=",state.dir)
	function f( name ) {
		//let default_things = tool.compile_file( state.space.resolve_module_path( name, state ), state)
		let default_things = tool.compile_file( path.join(conf.dir,name), state)
		state.env = {...state.env, ...default_things.state.current}
		tool.add_global_code( `// from ${name}` )
		tool.add_global_code( default_things.code )	
		return default_things.code;
	}
	
	let d1 = f( "default-transforms.cl" )
	let d2 = f( "default.cl" )

	state.space.default_things_code = d1 + "\n" + d2;
}