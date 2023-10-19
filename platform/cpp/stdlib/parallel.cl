/*
  "параллельный" map т.е. выполняется одновременно
  summary := parallel.map(@t2,8) { test | .... }

  todo сделать для dict
*/


func "map" {: arr batch_size f|
  // is_task_function стало тяжко назначать..
  //if (!f.is_task_function)
  //  return arr.map( f )

  function process_elem(e,index) {
    return new Promise( (resolve,reject) => {
    let result = f( e,index )
    //console.log('map process_elem result=',result+'')
    if (result instanceof CL2.Comm) {
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
    // console.log('map process_arr called, i=',i,batch_size)
    if (i >= arr.length) {
      //console.log('map process_arr: resolved finish')
      return Promise.resolve([])
    }

    let proms = []
    let count = batch_size
    while (count > 0 && i < arr.length) {
      proms.push( process_elem( arr[i],i ) )
      i++
      count--            
    }
    let all = Promise.all( proms )

    return all.then( (result) => {
      //console.log("resolved batch i=",i,batch_size)
      return process_arr( arr,i ).then( (rest_result) => {
        // дорогая передача..
        return [...result,...rest_result]
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