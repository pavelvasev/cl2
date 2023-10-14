export function init( state, tool ) {
	function f( name ) {
		let default_things = tool.compile_file( state.space.resolve_module_path( name, state ), state)
		state.env = {...state.env, ...default_things.state.current}
		tool.add_global_code( `// from ${name}` )
		tool.add_global_code( default_things.code )	
	}
	
	f( "std/default-transforms.cl")
	f( "std/default.cl")
}

