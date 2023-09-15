import F="./foo.js"

// мечты мечты
// print F.f1(10)

// мечты 2
// print (apply @F.f110)

print (apply {: return F.f1(10) :})

assert ((apply {: return F.f1(10) :}) == 100)
