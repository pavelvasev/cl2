#include <iostream>
#include <vector>
#include <memory> // shared_ptr
#include <any>
#include <iostream>
#include <algorithm> // для файнд
#include <functional> // для std::function

namespace cl2 {
  //int novalue = 337722;

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

    typedef std::function<void(T)> S;

    std::vector<S> subscribers;

    channel() {}

    // получается текущая реализация позволяет несколько раз подписаться. хм.
    auto subscribe( auto value ) {
      subscribers.push_back( value );

      auto unsub = [&value,this]() {
        auto index = std::find( subscribers.begin(), subscribers.end(), value );
        if (index != std::end( subscribers )) {
          auto it = subscribers.begin();
          std::advance( it, index ); // чтоб вы сдохли. где б.. слайс??? или сплайс.
          subscribers.erase( it );
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

    auto subscribe( auto value ) {
      return changed.subscribe( value );
    }

    // todo шедулить
    auto submit( auto value ) {
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
    typedef void (*action_fn)(T);

    channel<T> input; // todo много сделать, массив. ну или when_any обойдемся?
    cell<action_fn> action;
    //channel<Q> output;

    react() {
      //action.submit( init_action );

      input.subscribe( [this](auto val) {
        schedule( [&val,this]() {
          auto fn = action.get();
          fn( val );
          /*
          auto result = fn( val );
          // todo проверить что там вернули то

          output.submit( result );
          */
        });
      });

    }
  };


  //template <typename T>
  class binding : public object {
    public:
    //typedef void (*F)();
    //typedef std::function
    std::function<void(void)> subscription;
    binding( auto src, auto tgt ) {
      subscription = src.subscribe( tgt );
    }
    ~binding() {
      subscription(); // отпишемся
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
  react<T>& create_react(auto action) { return *(new react<T>(action)); }

  binding& create_binding(auto& src, auto& tgt) { return *(new binding(src,tgt)); }

  void attach( auto& host, auto name, auto& obj ) {}

}

