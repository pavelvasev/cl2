// F-THENABLE

alfa: cell
beta: cell

apply {: 
  Promise.resolve(alfa).then( (val) => {
    console.log("alfa resolved via promises",val);
    beta.submit(val)
  })
  alfa.submit(11)
:}

assert (@beta == 11)