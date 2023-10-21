#include <iostream>
#include <vector>
#include <memory> // shared_ptr
#include <any>
#include <iostream>
#include <algorithm> // для файнд
#include <functional> // для std::function

/* в наличии такая проблема. мы хотим создать связь между 2мя каналами A -> B.
   делаем это через binding. но теперь, если канал A удаляется,
   то надо остановить и связь. вопрос как binding об этом узнает?

   если биндинг сам подписывается на канал, то ему надо знать его тип.
   а этого бы очень хотелось избежать. но можно и так.

   другой вариант это вести отдельный список кого уведомить при удалении
   объекта. хехе.
*/

namespace cl2 {
  //int novalue = 337722;

  //typedef void (*forget_subscription_t)();
  // ей там надо хранить окружение поэтому она не может быть просто функцией...
  typedef std::function<void(void)> forget_subscription_t;

  /*
  template <typename T>
  class subscriber {
    virtual void submit( T ) = 0;
  }*/

  class object {
    public:
    std::string title;
    std::shared_ptr<object> attached_to;

    object() {
    }
  };

  template <typename T>
  class receiver : public object {
  public:
    virtual void submit( T ) = 0;

    // понаехали
    virtual forget_subscription_t subscribe( receiver<T>* subscriber ) {};
    virtual void unsubscribe( receiver<T>* subscriber ) {};
    virtual void unsubscribed( receiver<T>* subscriber ) {};
  };

  template<typename T>
  class channel : public receiver<T>
  {
    public:
    //typedef void (*S)(T);
    //typedef void (*S)(T);
    //typedef void S(T);  
    //std::vector<S&> subscribers;

    // typedef void (*S)(T);
    // это не катит если мы хотим лямбды подписывать, 
    // т.к. лямбда это на самом деле объект функтора
    // https://stackoverflow.com/questions/7951377/what-is-the-type-of-lambda-when-deduced-with-auto-in-c11
    // поэтому используем std::function
      // https://devtut.github.io/cpp/std-function-to-wrap-any-element-that-is-callable.html#storing-function-arguments-in-std-tuple
      // тут пишут про оверхеды функций.. может хранить ссылку на функтор всегда?

      // https://www.geeksforgeeks.org/functors-in-cpp/
      // мб функторы проще хранить

    //typedef std::function<void(T)> S;

    std::vector< receiver<T>* > subscribers;

    channel() {}

    // получается текущая реализация позволяет несколько раз подписаться. хм.
    forget_subscription_t subscribe( receiver<T>* subscriber ) {
      subscribers.push_back( subscriber );

      auto unsub = [subscriber,this]() {
        unsubscribe( subscriber );
      };

      return unsub;
    }

    void unsubscribe( receiver<T>* subscriber ) {
        auto index = std::find( subscribers.begin(), subscribers.end(), subscriber );
        if (index != std::end( subscribers )) {
          //auto it = subscribers.begin();
          //std::advance( it, index ); // чтоб вы сдохли. где б.. слайс??? или сплайс.
          subscriber->unsubscribed( this );
          subscribers.erase( index );
          //subscribers.erase( subscribers.begin() + index );
        }      
    }

    void submit( T value ) {
      //std::cout << this->title << ": submit called:" << value << std::endl; 
      for (auto s : subscribers) 
        s->submit( value );
      /*
      auto sz = subscribers.size();
      for (auto i = 0; i < sz; i++)
        subscribers[i].submit( value );
      */
    }

  };

  template<typename T>
  class cell : public receiver<T> {
  public:
    cell( auto value ) {
      have_value = true;
      cell_value = value;
    }
    cell() {
      have_value = false;
    }

    auto get() {
      return cell_value;
    }

    bool is_set() {
      //return cell_value != novalue;
      return have_value;
    }

    void unset() {
      have_value = false;
    }

    T cell_value;
    bool have_value;

    channel<T> changed;
    channel<T> changed_emit;
    channel<T> assigned;

    forget_subscription_t subscribe( T value ) {
      return changed.subscribe( value );
    }

    // todo шедулить
    void submit( T value ) {
      if (value != cell_value || !have_value) {
        cell_value = value;
        have_value = true;
        changed.submit( value );
      }
      assigned.submit( value );
    }

  };

/*
  class io_item: public object {
    public:
    cell input;
    cell output;
  };
*/  

  template <typename T>
  //template <typename T, typename Q>
  class react: public receiver<T> {
    public:
    //typedef void (*action_fn)(T);
    typedef std::function<void(T)> action_fn;

    // channel<T> input; // todo много сделать, массив. ну или when_any обойдемся?
    //cell<action_fn> action;
    //channel<Q> output;

    forget_subscription_t unsub;

    void submit( T val ) {
      ///std::cout << "react submit called:" << val << std::endl; 
      schedule( [&val,this]() {
          //auto fn = action.get();
          std::cout << "invoking action!";
          this->_action_fn( val );
          /*
          auto result = fn( val );
          // todo проверить что там вернули то

          output.submit( result );
          */
        });
    }

    action_fn _action_fn;

    react( channel<T>& input, action_fn fn ) {
      //action.submit( init_action );
      _action_fn = fn;
      // todo эта unsub будет невалидна, когда input сам себе удалится
      unsub = input.subscribe( this );
    }

    ~react() {
      unsub();
    }

  };

  // дизайн решение биндинг подписывает себя
  // и тогда когда src удалится он биндинга сам отпишет
  template <typename T>
  class binding : public receiver<T> {
    public:
    
    forget_subscription_t forget_subscription = nullptr;
    //typedef std::function
    // std::function<void(void)> subscription;

    receiver<T> *_tgt;
    receiver<T> *_src;

    void submit( T val ) {
      _tgt->submit( val );
    }

    void unsubscribed( receiver<T>* src ) {
      _src = nullptr;
    }

    binding( receiver<T>* src, receiver<T>* tgt ) {
      //forget_subscription = 0;
      _src = src;
      _tgt = tgt;
      _src->subscribe( this );

      //forget_subscription = src.subscribe( &tgt );

/*
      forget_subscription = [&src,&tgt]() {
        src.unsubscribe( &tgt );
      };
*/      

    }
    ~binding() {
      //if (forget_subscription)
      //forget_subscription(); // отпишемся
      if (_src) _src->unsubscribe( this );
    }
  };

  void schedule( auto fn ) {
    //std::cout << "Schedle called!";
    fn();
  }

  template <typename T>
  cell<T>& create_cell() { return *(new cell<T>()); }

  template <typename T>
  cell<T>& create_cell( T& value ) { return *(new cell<T>(value)); }

  template <typename T>
  channel<T>& create_channel() { return *(new channel<T>()); }

  object& create_object() { return *(new object()); }
  //channel& create_item() { return *(new item()) }
  //io_item& create_io_item() { return *(new io_item()); }

  // философский вопрос, а зачем у нас реакции возвращают значения..
  /*
  template <typename T, typename Q>
  react<T,Q>& create_react(auto action) { return *(new react<T,Q>(action)); }
  */
  template <typename T>
  react<T>& create_react(auto input, auto action) { return *(new react<T>(input,action)); }

  template <typename T>
  binding<T>& create_binding(auto& src, auto& tgt) { return *(new binding<T>(&src,&tgt)); }

  void attach( auto& host, auto name, auto& obj ) {}

}

