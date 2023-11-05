func "map" {: arr f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,index) {
    return new Promise( (resolve,reject) => {
      let result = f( e,index )
      //console.log('map process_elem result=',result+'')
      if (result instanceof CL2.Comm || result?.is_func_process) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result',result+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0 ) {
    //..console.log('map process_arr called, i=',i)
    if (i >= arr.length) {
      //console.log('map process_arr: resolved finish')
      return Promise.resolve([])
    }

    return process_elem( arr[i],i ).then( (result) => {
      //console.log('map process_arr: resolved iter result=',result+'')
      return process_arr( arr,i+1 ).then( (rest_result) => {
        // дорогая передача..
        return [result,...rest_result]
      })      
    })
  }

  function process_dict( arr,names,i=0 ) {
    //console.log('map process_dict')
    if (i >= arr.length) return Promise.resolve([]) 
    // ? получается map @dict это массив значений??

    return process_elem( arr[i],names[i] ).then( (result) => {
      return process_dict( arr,names, i+1 ).then( (rest_result) => {
        return [result,...rest_result]
      })
    })
  }  

  let output = CL2.create_cell(); //output.attached_to = self
  output.$title = "map_fn_output"
  // [...arr] переводит в массив принудительно, если там было Set например
  if (!Array.isArray(arr)) {
    if (arr instanceof Set)
        arr = [...arr]
  }

  //console.log("START map typeof(arr) =",typeof(arr),'self=',self+'' ,'arr=',arr)
  //console.log('start_MAP. self=',self+'')

  if (!Array.isArray( arr )) 
    process_dict( Object.values(arr), Object.keys(arr) ).then( values => output.submit( values ))
  else  
    process_arr( arr ).then( values => {
      //console.log('map done. values=',values)
      output.submit( values )
    })
  return output
:}

func "filter" {: arr f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e, index) {
    return new Promise( (resolve,reject) => {
    let result = f( e, index )
    if (result instanceof CL2.Comm || result?.is_func_process) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0 ) {
    if (i >= arr.length) return Promise.resolve([])

    return process_elem( arr[i] ).then( (result) => {
      return process_arr( arr,i+1 ).then( (rest_result) => {
        if (result)
          return [arr[i], ...rest_result]
        return rest_result
      })      
    })
  }


  let output = CL2.create_cell(); //output.attached_to = self
  output.$title = "filter_fn_output"

  if (!Array.isArray(arr)) arr = [...arr]
  process_arr( arr ).then( values => output.submit( values ))
  return output
:}

func "reduce" {: arr acc_init f |
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,index,acc) {
    return new Promise( (resolve,reject) => {

    let result = f( e, index, acc )
    if (result instanceof CL2.Comm || result?.is_func_process) {
          // console.log('see channel, subscribing once')
          // вернули канал? слушаем его дальше.. такое правило для реакций
          // но вообще это странно.. получается мы не можем возвращать каналы..
          // но в целом - а зачем такое правило для реакций? может его оставить на уровне apply это правило?
          let unsub = result.once( (val) => {
            // console.log('once tick',val,output+'')
            resolve( val )
          })
        }
        else {
          //console.log('submitting result to output',output+'')
          resolve( result )
        }
    })
  }

  function process_arr( arr,i=0,acc ) {
    if (i >= arr.length) return Promise.resolve(acc)

    return process_elem( arr[i],i,acc ).then( (result) => {
      return process_arr( arr,i+1,result )
    })
  }

  function process_dict( arr,names,i=0,acc ) {
    if (i >= arr.length) return Promise.resolve(acc)

    return process_elem( arr[i],names[i],acc ).then( (result) => {
      return process_dict( arr,names, i+1, result )
    })
  }

  let output = CL2.create_cell(); //output.attached_to = self
  output.$title = "titles_fn_output"

  // [...arr] переводит в массив принудительно, если там было Set например
  if (!Array.isArray(arr)) {
    if (arr instanceof Set)
        arr = [...arr]
  }
  if (typeof(arr) == "object") 
    process_dict( Object.values(arr), Object.keys(arr),0,acc_init ).then( values => output.submit( values ))
  else  
    process_arr( arr,0,acc_init ).then( values => output.submit( values ))
  return output  
:}