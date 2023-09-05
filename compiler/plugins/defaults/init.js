export function init( state, tool ) {
	let default_things = tool.compile_file( state.space.resolve_module_path( "std/default.cl", state ), state)
	state.env = {...state.env, ...default_things.state.current}
	tool.add_global_code( "// from defaults.cl" )
	tool.add_global_code( default_things.code )
}