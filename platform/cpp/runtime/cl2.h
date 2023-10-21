#include <iostream>
#include <vector>
#include <memory> // shared_ptr
#include <any>
#include <iostream>
#include <algorithm> // для файнд
#include <functional> // для std::function

namespace cl2 {
  //int novalue = 337722;

  //typedef void (*forget_subscription_t)();
  typedef std::function<void(void)> forget_subscription_t;

  class object {
    public:
    std::string title;
    std::shared_ptr<object> attached_to;

    object() {      
    }
  };

  template<typename T>
  class channel : public object 
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

    typedef std::function<void(T)> S;

    std::vector<S> subscribers;

    channel() {}

    // получается текущая реализация позволяет несколько раз подписаться. хм.
    forget_subscription_t subscribe( S value ) {
      subscribers.push_back( value );

      auto unsub = [value,this]() {
        auto index = std::find( subscribers.begin(), subscribers.end(), value );
        if (index != std::end( subscribers )) {
          //auto it = subscribers.begin();
          //std::advance( it, index ); // чтоб вы сдохли. где б.. слайс??? или сплайс.
          subscribers.erase( index );
          //subscribers.erase( subscribers.begin() + index );
        }
      };

      return unsub;
    }

    auto submit( auto value ) {
      auto sz = subscribers.size();
      for (auto i = 0; i < sz; i++)
        subscribers[i]( value );
    }

  };

  template<typename T>
  class cell : public object {
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

    forget_subscription_t subscribe( auto value ) {
      return changed.subscribe( value );
    }

    // todo шедулить
    void submit( auto value ) {
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
  class react: public object {
    public:
    //typedef void (*action_fn)(T);
    typedef std::function<void(T)> action_fn;

    // channel<T> input; // todo много сделать, массив. ну или when_any обойдемся?
    //cell<action_fn> action;
    //channel<Q> output;

    forget_subscription_t unsub;

    react( channel<T>& input, action_fn fn ) {
      //action.submit( init_action );

      unsub = input.subscribe( [&fn,this](T val) {
        schedule( [&val,&fn,this]() {
          //auto fn = action.get();
          fn( val );
          /*
          auto result = fn( val );
          // todo проверить что там вернули то

          output.submit( result );
          */
        });
      });
    }

    ~react() {
      unsub();
    }

  };


  //template <typename T>
  class binding : public object {
    public:
    
    forget_subscription_t forget_subscription;
    //typedef std::function
    // std::function<void(void)> subscription;
    binding( auto src, auto tgt ) {
      forget_subscription = src.subscribe( tgt );
    }
    ~binding() {
      forget_subscription(); // отпишемся
    }
  };

  void schedule( auto fn ) {
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

  binding& create_binding(auto& src, auto& tgt) { return *(new binding(src,tgt)); }

  void attach( auto& host, auto name, auto& obj ) {}

}

