form "foo" {: s |
  console.log("foo s=",s);
  let code = s.params[1].code
  console.log( "code[0]=",code[1] )
  
  let extra = {
    basis: 'print',
    basis_path: [ 'print' ],
    params: { '0': 'hello from decorator', '1': 'hmm'  },
    positional_params_count: 2,
    modul_prefix: '',
    links: {},
    name_is_autogenerated: true,
    '$name': '_decor_1'
  }
  code.unshift( extra )
  
  return s
:}

obj "my" decorators={ foo } {
  in {
    a : cell
  }
  print "hello from my" @a
}

my 1