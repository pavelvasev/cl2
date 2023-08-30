export function setup( state, tool ) {
	let default_things = tool.compile_file( state.space.resolve_module_path( "std/default.cl", state ), state)
	//let global_code = default_things.code
	//state = C.modify_env( state, default_things.state.current )
	console.log("loaded defailts",default_things.state.current)
	state.env = {...state.env, ...default_things.state.current}
	tool.add_global_code( "// from defaults.cl" )
	tool.add_global_code( default_things.code )
}
