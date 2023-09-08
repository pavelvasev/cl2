// todo: повысить приоритет для a operator b. например сделать так что operator в первой форме
// возможен будет только если он первый в перечислении (по аналогии с read)

// в этой версии ; оставлены как возможный но необязательный разделитель
// плюс сделана функция fill_env общая для окружений операторов и для обычных.

// https://github.com/peggyjs/peggy/blob/main/examples/json.pegjs
// https://github.com/peggyjs/peggy/blob/main/examples/javascript.pegjs
// https://dev.to/meseta/peg-parsers-sometimes-more-appropriate-than-regex-4jkk

// JSON Grammar
// ============
//
// Based on the grammar from RFC 7159 [1].
//
// Note that JSON is also specified in ECMA-262 [2], ECMA-404 [3], and on the
// JSON website [4] (somewhat informally). The RFC seems the most authoritative
// source, which is confirmed e.g. by [5].
//
// [1] http://tools.ietf.org/html/rfc7159
// [2] http://www.ecma-international.org/publications/standards/Ecma-262.htm
// [3] http://www.ecma-international.org/publications/standards/Ecma-404.htm
// [4] http://json.org/
// [5] https://www.tbray.org/ongoing/When/201x/2014/03/05/RFC7159-JSON

{{
  var env_counter=0;

    // F-SAFE-NAME
    // у нас в операциях могут быть символы всякие корявые типа +, < и т.п.
    // и так функции в js нельзя называть да и в других языках иногда тоже
    let g_regexp = /[^0-9a-zA-Z_\.]/g
    function name_to_safe_name( name ) 
    {
      return name.replaceAll( g_regexp,(s) => {
        return s.charCodeAt(0).toString()
      })
    }  

  function set_basis( env, first_feature_name )
  {
    let spl = first_feature_name.split(".")
    env.basis = spl[ spl.length-1 ] // последняя компонента
    env.basis_path = spl // весь путь
    env.modul_prefix = spl.slice(0,-1).join(".")
    if (env.modul_prefix.length > 0) 
        env.modul_prefix = env.modul_prefix + "." // todo optimize
    // задача в итоге получить modul_prefix равное "somepackage."
  }

  // фунция вызывается первой формой и операторной формой
  function fill_env( env, env_modifiers, child_envs )
  {

    // F-ENV-ARGS
    
    // if (child_envs && child_envs[0] && child_envs[0].env_args) {
      //env.child_env_args = child_envs[0].env_args;
    //}
    

    var linkcounter = 0;
    for (let m of env_modifiers) {
      if (m.positional_param) { // F_POSITIONAL_PARAMS

        env.positional_params_count ||= 0;
        env.positional_params_count++;
        // env.params[ "args_count" ] = env.positional_params_count;

        //console.log("PPF",m)

        if (m.value?.link === true) {
          m.link = true;
          m.from = m.value.value;
          m.to = (env.positional_params_count-1).toString();
          m.soft_mode = m.value.soft_flag;
          m.stream_mode = m.value.stream_flag; // F-PARAMS-STREAM
          m.locinfo = m.value.locinfo;
          // todo зарефакторить это а то дублирование с link_assignment
        }
        else
        {
          m.param = true;
          m.name = (env.positional_params_count-1).toString();

          // особый случай пустые объекты {} - надо отбросить их
          // потому что иначе запись вида dom {}; превращается в вызов с одним аргументом
          // а это вроде как не то что нам надо
          if (m.value && Object.keys( m.value ).length === 0 
              && Object.getPrototypeOf(m.value) === Object.prototype)
          {
            // эти штуки тоже надо откатить ... но опять же.. это нам сыграет злую шутку
            // когда мы захотим параметры пустые делать позиционные т.е. alfa 1 2 3 {};
            if (m == env_modifiers[ env_modifiers.length-1]) {
              env.positional_params_count--;
              env.params[ "args_count" ] = env.positional_params_count;
            }  
            continue;
          }    
        }
        
      }
      else
      if (m.param) {
         // пощетаем именованные тоже
         env.named_params_count ||= 0;
         env.named_params_count++;  

         if (m.positional_rest)
             env.positional_rest_param = m.name
         if (m.named_rest)
             env.named_rest_param = m.name
      }

      if (m.feature) {                                  // фича
        // задача - поругаться
        if (!m.extra_feature && Object.keys(env.features).length > 0) 
        {
          console.warn( "compolang: more than 1 feature in env! existing:",
              Object.keys(env.features),"name=",[m.name]);
          console.log( env.locinfo )
        }
        env.features[ m.name ] = m.params;
      }  
      if (m.feature_list) { // F-FEAT-PARAMS
        env.features_list = (env.features_list || []).concat( m.feature_list );
      }
      else
      if (m.param && m.value?.env_expression) {        // выражение вида a=(b)
        // преобразуем здесь параметр-выражение в суб-фичи
        // причем нам надо работать уметь и с массивом (если там формула)

          //  F-PARAM-EXPRESSION-COMPUTE
          // F-EXPRESSIONS-INLINE-COMPUTE

          /* признаю это устаревшим, потому что вводятся особые формы 2го уровня: if .. else ..
          if (m.value.env_expression.length != 1) {
            console.warn("computing env expr is not len 1!",m.value.env_expression)
          }
         */ 
          let comp_env = m.value.env_expression [0];

          if (comp_env.links[ `output_link` ])
            debugger ; // что-то странное

          env.links[ m.name ] = 
            { from: `${comp_env.$name}.output`, to: m.name, soft_mode: true, locinfo: m.value.locinfo, stream_mode: true };
          env.params[ m.name ] = {link: true, from: `${comp_env.$name}.output` }  

          comp_env.features["inline_computer"] = true // для отлова исходящих ссылок используется

          env.features_list ||= [];
          env.features_list.push( ...m.value.env_expression );


      }
      else
      if (m.param && m.value?.param_value_env_list) { // выражение вида a={b}
         //env.env_list_params ||= {};
         //debugger;
         //env.env_list_params[ m.name ] = m.value.param_value_env_list;
         let v = m.value.param_value_env_list;
         v.needLexicalParent=true;
         v.this_is_env_list = true;
         env.params[ m.name ] = v; 
      }
      else
      if (m.param)
        env.params[ m.name ] = m.value;
      else
      if (m.link) {
      /*
        env.links[ `link_${linkcounter++}` ] = { from: m.from, to: m.to, soft_mode: m.soft_mode, locinfo: m.locinfo, stream_mode: m.stream_mode }
        */
        env.links[ m.to ] = { from: m.from, to: m.to, soft_mode: m.soft_mode, locinfo: m.locinfo, stream_mode: m.stream_mode }

        // F-CL2
        // ну вроде как я это признаю излишним что ли..?
        env.params[ m.to ] = {link: true, from: m.from }
      }
        // F-PARAMS-STREAM
    }

    //console.log(env);

    append_children_envs( env, child_envs || [] );

    //console.log("final, env.$name=",env.$name)
    if (env.$name == "item" && Object.keys( env.features ).length > 0) {
        //env.$name = Object.keys( env.features ).join("_");
        // env.$name = Object.keys( env.features )[0]; // лучше называть по первой фиче..
        // а то потом в гуи видим длинные названия - а по факту все-равно первая главная
        // а остальные так
        // update: выяснился такой баг, что если мы пытаемся ссылаться на объект фичи
        // то выходит что нам этот объект имеет такое название...
        // и мы ссылки имеем корявые.. хотя конечно это удобно для адресации безусловно,
        // но по факту ведет к такому интресному ментальному багу...
        // посему хотя бы префикс припишем...
        //env.$name = "_" + Object.keys( env.features )[0]; // лучше называть по первой фиче..
        
        //let basis = Object.keys( env.features )[0]
        //console.log('calling for env',env)
        env.$name = `_${name_to_safe_name(env.basis)}_${env_counter++}`; 
        
        // F-FEATURE-OBJ-NAMES-UNIQ уникальный счетчик 
        // лучше называть по первой фиче.. 
    }

    

  };



  function is_env_real( e ) {
   let res = Object.keys(e.features).length > 0
        || (e.features_list || []).length > 0
        || Object.keys(e.params).length > 0
        || Object.keys(e.children).length > 0
        || Object.keys(e.links).length > 0
        || !e.name_is_autogenerated
        ;
        
   
   //if (!res) console.log("ENV NOT REAL",e.$name)
   return res;
  }

  function append_children_envs( env, envs ) {
    var counter=0;
    for (let e of envs) {
      if ( is_env_real(e))
        {
           var cname = e.$name;
           while (env.children[ cname ])
             cname = `${cname}_${counter++}`;

           e.$name = cname; // ладно уж не пожадничаем...
           // но в целом тут вопросы, надо какие-то контексты вводить
           // если разные тела присылают одинаковые имена... (это же раньше было что 1 класс=тело, а теперь многофичье..)
           env.children[ cname ] = e;
        }
    }
    if (envs.env_args)
      env.children_env_args = envs.env_args;
  }
}}  
{

class LocInfo {
  constructor(s) { this.s=s }
  toString() {
     return this.s;
  }
}

  function getlocinfo() {
    let s1 = location();
    let s2 = offset();
    let s3 = range();

    let lines = [];
    for (let i=s1.start.line-3; i<s1.start.line+3; i++) {
      let s = `${i==s1.start.line-1 ? '*':' '} ${i+1}: ${s1.source.lines[i]}`;
      lines.push(s);
    }
    //let lines = s1.source.lines.slice( s1.start.line-3, s1.start.line+3 );
    //lines[2] = '>>> '+lines[2];
    let file = s1.source.file;
    //let loc = `file: ${file}\nline: ${s1.start.line}\n...\n${lines.join('\n')}\n...`;
    let loc = `file: ${file}\n...\n${lines.join('\n')}\n...`;

    loc = new LocInfo( loc )
    loc.short = getlocinfo_short()

    return loc;
  }

  // доп - короткая версия
  function getlocinfo_short() {
    let s1 = location();
    let i = s1.start.line-1
    let short = `${i+1}: ${s1.source.lines[i]}`
    return short
  }

  function new_env( name ) {
    var new_env = { features: {}, params: {}, children: {}, links: {} };
    new_env.$base_url = base_url;
    new_env.this_is_env = true;
    if (!name) { name="item"; new_env.name_is_autogenerated=true; }
    new_env.$name = name;
    return new_env;
  }
  
  let e0 = peg$buildStructuredError
  peg$buildStructuredError = function(expected, found, location) {
    let r0 = e0( expected, found, location )
    
    let k = Object.keys( peg$posDetailsCache )
    let ks = k[ k.length - 1 ]
    let kk = parseInt( ks )
    let rec  = peg$posDetailsCache[ks]
    let str = input.slice( kk, kk+100 )
    r0.extra_info = `***** parser reached line ${rec.line} col ${rec.column}:\n${str}\n*****`
    
    return r0
  }

  //debugger //mememe

  var envs_stack = [];
  var base_url = options.base_url || "";
  //var diag_file = options.diag_file || "";
  var current_env;
  new_env();

  if (!options.base_url) console.error("COMPOLANG PARSER: base_url option is not defined")
}

// ----- 2. JSON Grammar -----

JSON_text
  = __ envs:env_list? __ {
     var env = new_env();
     append_children_envs( env, envs || [] );
     return env;
  }

env
  = __ @env_let_shortcut

begin_array     = ws "[" ws
begin_object    = ws "{" ws
end_array       = ws "]" ws
end_object      = ws "}" ws
name_separator  = ws ":" ws
value_separator = ws "," ws

ws "whitespace" = [ \t\n\r]*

// ----- A1. env items
env_modifier
  = attr_assignment
  / link_assignment
  / positional_attr
  / feature_addition
  / positional_rest
  / named_rest

env_modifier_for_operator
  = attr_assignment
  / link_assignment
  / positional_attr
  / feature_addition_for_operator
 
// ----- A2. attr_assignment
attr_assignment
  = name:attr_name ws "=" ws value:value {
    return { param: true, name: name, value: value }
  }

positional_rest
  = "*" name:attr_name {
    return { param: true, name: name, positional_rest: true,value:[] }
  }

named_rest
  = "**" name:attr_name {
    return { param: true, name: name, named_rest: true,value:{} }
  }


// F_POSITIONAL_PARAMS
positional_attr
  = value:positional_value {
    // todo посмотреть че сюда попадает
    // console.log("PP",value)
    return { positional_param: true, value: value }
  }
  
link_assignment
  = name:attr_name ws "=" ws linkvalue:link soft_flag:("?")? stream_flag:("!")? { 
    //var linkrecordname = `link_${Object.keys(current_env.links).length}`;
    //while (current_env.links[ linkrecordname ]) linkrecordname = linkrecordname + "x";
    //current_env.links[linkrecordname] = { to: name, from: linkvalue.value };
    let linkvalue2 = { 
      link: true, 
      to: name, 
      from: linkvalue.value,
      soft_mode: soft_flag ? true : false,
      stream_mode: stream_flag ? true : false, // F-PARAMS-STREAM
      locinfo: linkvalue.locinfo
      };

    //console.log("LINK",linkvalue2);
    return linkvalue2
    
  }
  
feature_addition
  = "{{" __ env_list:env_list? __ "}}" {
    // F-FEAT-PARAMS
    return { feature_list: env_list }
  }
  / "~" name:feature_name {
    // специальный вариант чтобы отсечь доп-фичи в объектах
    // синтаксис: ~name
    return { feature: true, name: name, params: {}, extra_feature: true }
  }

feature_addition_for_operator
  = name:feature_operator_name {
    // if (name == "args_count") console.log(getlocinfo());
    return { feature: true, name: name, params: {} }
    //current_env.features[name] = true;
  }
  / feature_addition
  
  
// ------ A3. attr_name
Word
  = [a-zA-Zа-яА-Я0-9_\-*&~]+ { return text(); } // убрали точку из имени.. будем делать аксессоры из них
  // = [a-zA-Zа-яА-Я0-9_\-\.]+ { return text(); } // разрешили точку в имени.. хм... ну пока так..
  //= [a-zA-Zа-яА-Я0-9_-]+ { return text(); }

attr_name
  = Word

//attr_name_with_dots
//  = [a-zA-Zа-яА-Я0-9_-\.]+ { return text(); } 

// разрешим еще больше в имени чтобы фичи могли называться как угодно < || && + и т.д.
feature_name "feature name"
  = [a-zA-Zа-яА-Я0-9_\-\.!]+ { return text(); } 
  / feature_operator_name // оставим возможность фичам вида + a b c

feature_operator_name  // разрешим еще больше в имени чтобы фичи могли называться как угодно < || && + и т.д.
  = "+" { return text(); }
  / "-" { return text(); }
  / "*" { return text(); }
  / "/" { return text(); }
  / "<" { return text(); }
  / ">" { return text(); }
  / "==" { return text(); }
  / "and" { return text(); }
  / "=>" { return text(); }
  / "or" { return text(); }
  / "not" 
  { return text(); }

  /*
  = [-\.\+\-\*\<\>\=\&!]+ { return text(); } 
  / [\|][\|] { return text(); }  // символ || особый случай т.к. | занят пайпом
  / "or" { return text(); }
  / "and" { return text(); }
  / "not" { return text(); }
  */

//  = [a-zA-Zа-яА-Я0-9_\-\.\+\-\/\*\<\>\[\]\=\&!]+ { return text(); }   

obj_id
  = [a-zA-Zа-яА-Я_][\.a-zA-Zа-яА-Я0-9_]* { return text(); }
  //= [a-zA-Zа-яА-Я0-9_]+ { return text(); }

obj_path
  = [\.\/~]+ { return text(); } 

one_env
  = one_env_operator
  / one_env_obj
  / one_env_positional_attr


// ------- A. envs
one_env_obj "environment record"
  =
  envid: (__ @(@attr_name ws ":")?)
  __ first_feature_name:feature_name
  env_modifiers:(__ @env_modifier)*
  child_envs:(__ "{" __ @env_list? __ "}" __)?
  {
    var env = new_env( envid );
    env.locinfo = getlocinfo();
    // этим мы застолбили что фича первая всегда идет и точка.
    env.features[ first_feature_name ] = {};
    
    set_basis( env, first_feature_name )

    fill_env( env, env_modifiers, child_envs )

    return env;
  }
  //finalizer: (__ ";")*

// F-MATH-OPERATOR
// особый случай на предмет записи в стиле a + b
one_env_operator "environment operator record"
  =
  envid: (__ @(@attr_name ws ":")?)
  first_positional_attr: (__ @positional_attr)
  env_modifiers:(__ @env_modifier_for_operator)+
  child_envs:(__ "{" __ @env_list? __ "}" __)? // нафига операторам чайл енвс
  {
    var env = new_env( envid );
    env.locinfo = getlocinfo();

    let first_feature_name = env_modifiers[0].name
      //console.log("QQQQ",first_feature_name,getlocinfo())
    let spl = first_feature_name.split(".") 
    env.basis = spl[ spl.length-1 ] // последняя компонента
    env.basis_path = spl // весь путь
    env.modul_prefix = spl.slice(0,-1).join(".")
    //console.log("EEEE",env.basis, env.basis_path)

    fill_env( env, [first_positional_attr].concat(env_modifiers), child_envs )

    if (env_modifiers.length == 0) {
       console.error("operator record, no feature!",env_modifiers);
       console.log( env.locinfo );
    };

    return env;
  }

// особый случай вида (@some) например для if (@some->k)
one_env_positional_attr "environment positional record"
  =
  envid: (__ @(@attr_name ws ":")?)
  first_positional_attr: (__ @positional_attr)
  {
    // хак в связи с F-EVAL-SHORTCUT
    let te = first_positional_attr.value?.env_expression
    if (te) {
      if (te[0].features["m-eval"]) {
        return te[0]
      }
    }
    //console.log("one_env_positional_attr",envid,first_positional_attr, getlocinfo())
  
    var env = new_env( envid );
    
    env.locinfo = getlocinfo();

    //env.features["read"] = {}; // ладно уж - пусть это будет read когда написали (@k)
    set_basis( env, "read" )
    fill_env( env, [first_positional_attr], [] )

    return env;
  }  


// F-LET-SHORTCUT-OPERATOR
env_let_shortcut
 = var_id:attr_name __ ":=" __ env:env_pipe
 {
   var let_env = new_env();
   set_basis( let_env, "let")
   fill_env( let_env, [ {param: true, name: var_id, value:{env_expression: [env], locinfo: getlocinfo() }}])   
   return let_env
 }
 / env_pipe

env_pipe
 = pipeid:(attr_name __ ":")? __ input_link:link tail:(__ "|" @one_env)+
 {
   // случай вида @objid | a | b | c тогда @objid идет на вход пайпе
   // и заодно случай вида @objid->paramname | a | b | c
   
   //console.log("found env pipe with input link:",input_link,tail)
   var pipe = new_env( (pipeid || [])[0] );
   pipe.features["pipe"] = true;

/* F-PARAMS-STREAM - я подумал а пусть она всегда да и все. Там на входах разберутся.
   let tail_objs = [], tails_stream_marks = [];
   let ismark=true;
   tail.forEach( (t,index) => {
     if (ismark) tails_stream_marks.push( t ); else tail_objs.push( t )
     ismark = !ismark;
   })
   append_children_envs( pipe, tail_objs );
   pipe.params.stream_marks = stream_marks;
*/
   append_children_envs( pipe, tail );

   //var input_link_v = input_link.value.replaceAll("->.","->output");

   // по итогу долгих историй выяснилось что вот эта строчка великое зло
   // потому что она 1 портит input вида: @s->. | m1 заменяя @s на @s->output что неверно
   // и 2 требует чтобы мозг помнил что записи вида @s | m1 будут заменены на @s->output
   // короче решено пусть всегда все будет нафиг единообразно.
   // т.е. какую ссылку в начале пайпы указали - то и будет входом безо всяких преобразований.

   let input_link_v = input_link.value;

   pipe.links["pipe_input_link"] = { to: ".->input", from: input_link_v, locinfo: getlocinfo(), stream_mode: true }
   //return finish_env();
   return pipe;
 }
 / head:one_env tail:(__ "|" @one_env)*
 {
   if (head && tail.length > 0) {
     // console.log("found env pipe of objects:",head,tail)
     // прямо пайпа
     // переименуем голову, т.к. имя заберет пайпа
     var orig_env_id = head.$name;
     head.$name = "head";
     var pipe = new_env( orig_env_id );
     pipe.name_is_autogenerated = head.name_is_autogenerated;
     head.name_is_autogenerated = true;
     pipe.features["pipe"] = true;

     append_children_envs( pipe, [head,...tail] );
     
     return pipe;
   }
   else {
     return head;
   }
 }

// F-ENV-ARGS 
env_args_list "environment args list"
  = "|" __ attrs:(@attr_name __ ","? __)+ __ "|"
  { return { attrs: attrs }
  }
  
env_list "environment list"
  = __ args:env_args_list? // F-ENV-ARGS 
    __
    head:env tail:((__ ";")* @env __ )* (__ ";")*
    __
    {
    // выяснилось что у нас в tail могут быть пустые окружения
    // и надо их все отфильтровать...
    
    let res = [head];
    for (let it of tail) {
      if (is_env_real(it)) res.push( it );

      // F-WARN-PIPE
      if (it.links["pipe_input_link"])
        {
          console.warn("compolang: pipe with @var in not 1st place of env list");
          console.log( it.links["pipe_input_link"].locinfo );
        }      
    }

    // F-ENV-ARGS
    if (args) 
      res.env_args = args;

    return res;

    //return [head,...tail]; 
    }

link "link value"
  = "@" obj_id "->" attr_name
  {
  
    return { link: true, value: text(), locinfo: getlocinfo() }
  }
  / "@" obj_id:obj_id
  {
    return { link: true, value: obj_id, locinfo: getlocinfo() }
    //return { link: true, value: text() + "->.", locinfo: getlocinfo() }
  }
  / "@" path:(obj_path "->" attr_name)
  {
    return { link: true, value: path.join(""), locinfo: getlocinfo() }
  }
  / "@" path:obj_path 
  {
    return { link: true, value: path + "->.", locinfo: getlocinfo() }
  }

// F_ACCESSORS 

accessor
  = "@" first_attr:obj_id attrs:( "." @attr_name @qmark:("?")? @stream_mark:("!")?)+
  {
     // пока оставлена ведущая @ но в принципе уже можно и без нее
     // оставлена потому что если например без аксессора надо просто сослаться на объект
     // то как бы непонятно становится, как это отличать от фич, которые у нас все еще разрешены в изобилии
     // но может быть стоит фичи сделать как-то типа так: some .extra .other ну например..
     // ... ну пока так попробуем.. и еще сейчас нытья нету, это может оказаться плохо
     // может быть стоит добавить как со ссылками, ? к именам и это означает что тут можно default убрать
     // добавлено. к имени аттрибута, начиная со второго, можно приписывать ?
     // а что если туда же писать дефолт значения? т.е. alfa=@b.c?(3) не, это сложный синтаксис.

     // console.log("making accessor",first_attr, attrs)
     // debugger;

     let pipe = new_env();
     pipe.features["pipe"] = true;
     let locinfo = getlocinfo();
     pipe.links["pipe_input_link"] = { to: ".->input", from: "@" + first_attr, locinfo: locinfo }
     pipe.this_is_geta_pipe = true

     let arr = [];
     for (let i=0; i<attrs.length; i++)
     {
       let a = attrs[i][0];
       let g = new_env();
       g.features["geta"]=true;
       //g.params[0] = { positional_param: true, value: a }
       g.params[0] = a;
       if (attrs[i][1]) // отметка "?" qmark - означает нам не страшно что нет значения, пусть будет null по умолчанию
         g.params['default'] = null;
       if (attrs[i][2]) // отметка "!" stream_mark // F-PARAMS-STREAM
         g.params['stream_mode'] = true;
       g.positional_params_count=1;
       g.params[ "args_count" ] = 1;
       g.locinfo = locinfo;
       arr.push( g )
     }

     if (arr.length == 1) { // простая гета - подсократим убрав пайпу
       pipe = arr[0]
       pipe.links["pipe_input_link"] = { to: ".->input", from: "@" + first_attr, locinfo: locinfo }
       //console.warn( "PIPE optimized", pipe )
     }
     else
       append_children_envs( pipe, arr );

     return { env_expression: [pipe], locinfo: locinfo }
  }


// ----- 3. Values -----

// приходится ввести positional_value чтобы не брать значений вида {....} потому что это у нас чилдрен
// F_POSITIONAL_PARAMS
positional_value
  = false
  / null
  / true
  / accessor
  / object
  / array
  / number
  / string
  / js_inline
  / linkvalue:link soft_flag:("?")? stream_flag:("!")? {
    linkvalue.soft_flag = soft_flag ? true : false;
    linkvalue.stream_flag = stream_flag ? true : false; // F-PARAMS-STREAM
    return linkvalue;
  }
  / "(" ws env_list:env_list ws ")" {
    // attr expression
    /*
    if (env_list.length > 1) {
       console.error("compolang: more than 1 record in positional ()",env_list)
       console.log( getlocinfo() );
    }
    */
    return { env_expression: env_list, locinfo: getlocinfo() }
  }

value
  = false
  / null
  / true
  / accessor
  / object
  / js_inline
  / array
  / number
  / string  
  / "{" __ env_list:env_list? __ "}" {
    return { param_value_env_list: env_list || [] }
  }
  / "(" ws env_list:env_list ws ")" {
    // attr expression
    if (env_list.length > 1) {
       console.error("compolang: more than 1 record in attr val ()",env_list)
       console.log( getlocinfo() );
    }
    return { env_expression: env_list, locinfo: getlocinfo() }
  }
  

false = "false" { return false; }
null  = "null"  { return null;  }
true  = "true"  { return true;  }

///////////////////////////////////////// F-JS-INLINE

js_inline_attr_modifier
  = attr_assignment
  / link_assignment  
  / attr_name
  / "..." attr_name:attr_name { return "..."+attr_name } // разрешим вариант ...args F-JS-INLINE-DOTS
  

// + тут особый вариант F-EVAL-SHORTCUT: @{: ... :} это значит евалить эту функцию.
// todo надо выдавать ошибку если встретили {: внутри...
js_inline "js inline code"
  = "{:" attrs: (__ (",")* __ @js_inline_attr_modifier __)+ "|" chars:(!":}" .)* ":}" {
    let code = chars.map(c=>c[1]).join("");
    var env = new_env();

    // передадим перечень позиционных параметров в параметр positional_args
    // а именованные - сделаем пропертями.
    let env_modifiers = [];
    let pos_args = [];
    //console.log("attrs=",attrs)
    for (let i=0; i<attrs.length; i++) {
      let attr = attrs[i];
      if (typeof(attr) === "string") {
        //console.log("PPPPPositional", attr)
        pos_args.push( attr )
      } else {
        console.error("NNNNNamed",attr)
        //env_modifiers.push( attr )
      }  
    }

    return { code, pos_args }
  }
  / "{:" chars:(!":}" .)* ":}" {
    let code = chars.map(c=>c[1]).join("");

    return { code, pos_args:[] }
    
  }


js_inline_old "js inline code"
  = "[[[" chars:(!"]]]" .)* "]]]" { 
    let code = chars.map(c=>c[1]).join("");
    let result
    try {
      result = eval( code )
    } catch(err) {
      console.error("compalang pegjs: error in inline js:", err,code)
      return null;
    }
    return result;
  }


// ----- 4. Objects -----

object
  = begin_object
    members:(
      head:member
      tail:(value_separator @member)*
      {
        var result = {};
        [head].concat(tail).forEach(function(element) {
          result[element.name] = element.value;
        });
        return result;
      }
    )?
    end_object
    { return members !== null ? members: {}; }

member
  = name:string name_separator value:value {
      return { name: name, value: value };
    }

// ----- 5. Arrays -----

array
  = begin_array
    values:(
      head:value
      tail:(value_separator @value)*
      { return [head].concat(tail); }
    )?
    end_array
    { return values !== null ? values : []; }

// ----- 6. Numbers -----

number "number"
  = minus? int frac? exp? { return parseFloat(text()); }

decimal_point
  = "."

digit1_9
  = [1-9]

e
  = [eE]

exp
  = e (minus / plus)? DIGIT+

frac
  = decimal_point DIGIT+

int
  = zero / (digit1_9 DIGIT*)

minus
  = "-"

plus
  = "+"

zero
  = "0"

// ----- 7. Strings -----

// вместо char2 было SourceCharacter

string "string"
  = "`" chars:(!"`" char2)* "`" { 
    return chars.map(c=>c[1]).join(""); 
  }
  / "'" chars:(!"'" char2)* "'" { 
    return chars.map(c=>c[1]).join(""); 
  }
  / "\"" chars:(!"\"" char2)* "\"" { 
    return chars.map(c=>c[1]).join("");
  }  
  / quotation_mark chars:char* quotation_mark { 
    return chars.join(""); 
  }

//  / quotation_mark2 chars:char* quotation_mark2 { return chars.join(""); }
//  / quotation_mark3 chars:char* quotation_mark3 { return chars.join(""); }

char2
  = escape
    sequence:(
      "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }
  / .  

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape
  = "\\"

quotation_mark
  = '"'
quotation_mark2
  = "'"
quotation_mark3
  = "`"

unescaped
  = [^\0-\x1F\x22\x5C]

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i

///////////////////// comments

// ----- A.1 Lexical Grammar -----

SourceCharacter
  = .

WhiteSpace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "\uFEFF"
  / Zs

// Separator, Space
Zs = [\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028"
  / "\u2029"

Comment "comment"
  = MultiLineComment
  / SingleLineComment

MultiLineComment
  = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

SingleLineComment
  = "//" (!LineTerminator SourceCharacter)*
  / "#" (!LineTerminator SourceCharacter)*

__
  = (WhiteSpace / LineTerminatorSequence / Comment)*