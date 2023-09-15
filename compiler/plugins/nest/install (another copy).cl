func("go") { |tool state|
  let to_git_list = process_module("." tool state)
  return map(to_git_list) { |rec|
    let dir = tool.get_module_dir( rec )
    return clone_sync( rec.git dir )
  }
}

func("process_module") { |dir tool state|
  let conf = tool.load_module_config( dir state )

  let to_git = filter(conf.modules) { |m| return m.git }

  let to_git_them = map(conf.modules) { |rec|
    let dir = tool.get_module_dir( rec )
    return process_module( dir tool state )
  } | flatten()

  return list(to_git ...to_git_them)
}

func("clone_sync") { |src dir|
  if (fs.exist(dir)) {
    os.exec( "git pull" cwd=dir)
  } else {
    os.exec( "git clone" src dir)
  }
}

собственно проблема заключается в том, что надо понять когда закончить передавать аргументы и начать следующий оператор

m 10 m 20 sigma teta

и поэтому варианты

m 10 (m 20) (sigma) teta

m 10 %m 20 %sigma teta
  -- все что до следующего % или оператора это типа позиционный аргумнет. но как делать вложенность?

m( 10, m 20, sigma ) teta()

# руби-стиль. почему-то он работает.
m 10, m 20, sigma teta

# ну и на самом деле еще в руби стиле - нашем - там именованным аргументам запятые то не нужны же

m 10, m 20, sigma gamma=(sin x) teta

m 10, m 20 cos(x), sigma gamma=(sin x) teta

да можно да тяжко чет...

print "sin = " sin(x) ; print "cos = " cos(x)

в принципе если вернуть точки с запятой то:

print a b c (d + 10) alfa(20)

ну а че плохо то обычный синтаксис аля петон

print( a,b,c, d+10, alfa(20))
m( 10, m(20,cos(x)), sigma, gamma=sin(x) ) teta

ну типа для разметки некрасиво..

scene3d( bgcolor=[1,0,0] ) {
  visual()
  visual()
  axes( length = 20 )
  subviewport() {
    ну тупняково чутка что всюду пустые скобки.. но нам надо как-то выделять оператор вызова
    плюс что-то делать с
  }
}

func "go" { |tool state|
  let to_git_list = process_module[ "." tool state ] 
  map[to_git_list] { |rec|
    let dir = apply[tool.get_module_dir rec]
    clone_sync rec.git dir
  }
}


---
print[ a b c (d+10) alfa[20]]
m( 10 m(20 cos(x)) sigma gamma=sin(x) ) teta

visual3d len=(x+10) style=generate_style(alfa,beta,gamma)

visual3d @positions @colors len=(x+10) style=generate_style(alfa,beta,gamma)

вон я чего делаю - перехожу на стиль со скобочкой.. но зачем-то вставил там запятых

visual3d @positions @colors len=(x+10) style=generate_style(alfa beta gamma)

ну а как вставить позиционное?

visual3d @positions @colors generate_normals( positions, colors ) len=(x+10) style=generate_style(alfa beta gamma)

и непонятно что generate_normals оно аргумен
может запятые пусть появляются на позициях?

visual3d positions, colors, generate_normals( positions, colors ) len=(x+10) style=generate_style(alfa beta gamma)

но тогда

visual3d positions, colors

как понять что colors это аргумент? а ну по запятой..

ну т..е я морально готов вводить скобочки но уже для аргументов как бы..
для под-деревьев.. а на первом уровне не готов, на первом уровне мне без них хочется.
ну кстати а почему нет. тупо но почему нет.

итого в выражениях аргументов скобочки, а в 1-м уровне списков скобочек не надоть.

scene3d bgcolor=[1,0,0]  {
  visual filter_positions(positions)
  visual
  axes length = 20 
  subviewport {    
  }
}

но как понять что filter_positions это позиционный аргумент?

мысли - убрать () в выражениях именованных, там без них норм. оставить позиционным.
кардинально - вводить () ток для позиционных а без них норм. но там вопросы..

!!!!!!!!!!!!!!!!!!!!

по первому варианту
scene3d bgcolor=[1,0,0]  {
  visual (filter_positions @positions)
  visual
  axes length = 20 
  subviewport {    
  }
}

func "go" { |tool state|
  let to_git_list = process_module "." @tool @state
  map @to_git_list { |rec|
    let dir = apply @tool.get_module_dir @rec
    clone_sync @rec.git @dir
  }
}

ну кстати это достижение - хотя бы без дурацкой скобочки в именованных.

ну и тут мы все еще остаемся на уровне с-выражений наших. х-выражений.

print (sin x) formatter=get_formatter 10

а ну кстати тут понятно куда идет позиционный аргумент - он идет в выражение.

а непонятно другое

print (sin x) formatter=get_formatter 10 endline="\n"

кому принадлежит endline? блллияать.to_git_them

ну тады запятые мб...

print (sin x), formatter=get_formatter 10 (2 * y), endline="\n"

sin x к сожалению не катит. 

---------------------------------
кардинально - вводить () ток для позиционных а без них норм. но там вопросы..

ну короче таки идея - за адаптивность. типа в тех или иных ситуациях так или сяк.
и еще вариант что на разных уровнях по разному, например в подвыражениях.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

ну типа это плохо что нет единообразия канеш.

visual3d positions=generate_positions(arr alfa=5)

visual3d( alfa beta gamma positions=generate_positions(arr alfa=5) )

s=find 10

-----

visual (filter_positions @positions)

let beta=generate_sync a=5 b=7
и приехали..
и аналогично
beta=generate_sync a=5 b=7
вот что тут что?

ок а если внутренний apply по скобкам после?
т.е.

thing fun1(alfa) fun2(beta)

ну это тоже такое себе.. не очень даже глазу ясно, что имеется ввиду

visual(filter_positions(positions))

text "thing"
text generate_text(alfa)?? как..

ну если точки с запятой вернуть то

text generate(alfa) sigma(beta) a b c func1();

===========================
card {
  dom.h1 text="privet"
  grid {
     text generate_text()
     imga get_imga()
  }
}

print a b c

print a

вот что здесь что? уже непонятно...

====
вот в лиспе четко - выражение у него начало и конец.
вот нам бы что-то такое же.. но я же не хочу скобочек..

а кстати а если квадратные это вызов функции? можно но это не отменяет ссылок.

@card {
  @dom.h1 text=@generate(sigma)
  @grid {
    @text @generate_text
  }
}

print sin(x)

print (sin [x])

print [sin [x]]

print(sin(x))

t = sin x

ну похоже наш и питонский рулит.. увы..

----
let to_git_list = (process_module "." @tool @state)
 меня вот это почему-то дико бесит

напрашивается классический вызов
let to_git_list = process_module ("." @tool @state)

но он не сработает в позиционном варианте

print generate(1)

print sin(x)

вот очевидно 2 раздельных оператора.

print( sin x )

y = sin x print y

y = sin x ; print y

типа разделитель ; или перенос строки (ррррр!)

но как быть с многострочниками

y = generate
      teta 5
      gamma 10

дык и самому, человеку, непонятно.

-----------------
ну и еще дебильная мысль это - что для объектного режима один синтаксис а для функционального другой.
потому что ну они так подходят