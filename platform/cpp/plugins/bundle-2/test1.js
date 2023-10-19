{ //namespace1
 function foo() { console.log("123") }

    //экспорт 
    var namespace1 = {afoo: foo};
}

{//namespace2
 function foo() { console.log("12345") }
 var namespace2 = {afoo: foo};
}

{
    namespace1.afoo()
    namespace2.afoo()
}