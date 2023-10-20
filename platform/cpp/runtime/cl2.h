#include <iostream>
#include <vector>
#include <memory> // shared_ptr
#include <any>
#include <iostream>

namespace cl2 {
  int novalue = 337722;

  class object {
    public:
    std::string title;
    std::shared_ptr<object> attached_to;

    object() {      
    }
  };

  class channel : public object 
  {
    public:
    std::vector<std::any> subscribers;

    channel() {}

    // получается текущая реализация позволяет несколько раз подписаться. хм.
    auto subscribe( auto value ) {
      subscribers.push_back( value );

      auto unsub = [&value,this]() {
        auto index = std::find( subscribers.begin(), subscribers.end(), value );
        if (index != std::end( subscribers )) {
          subscribers.erase( subscribers.begin() + index );
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

    std::any cell_value;
    bool have_value;

    channel changed;
    channel changed_emit;
    channel assigned;

    auto subscribe( auto value ) {
      return changed.subscribe( value );
    }

    // todo шедулить
    auto submit( auto value ) {
      if (value == novalue) {
        unset();
        return;
      }
      if (value != cell_value)
        changed.submit( value );
      assigned.submit( value );
    }

  };

  class io_item: public object {
    public:
    cell input;
    cell output;
  };

  class react: public object {
    public:
    channel input; // todo много сделать, массив. ну или when_any обойдемся?
    cell action;
    channel output;

    react( auto init_action ) {
      action.submit( init_action );

      input.subscribe( [this](auto val) {
        schedule( [&val,this]() {
          auto fn = action.get();
          auto result = fn( val );

          // todo проверить что там вернули то

          output.submit( result );
        });
      });

    }
  };


  class binding : public object {
    public:
    typedef void F();

    F subscription;
    binding( auto src, auto tgt ) {
      this->subscription = src.subscribe( tgt );
    }
    ~binding() {
      this->subscription(); // отпишемся
    }
  };

  void schedule( auto fn ) {
    fn();
  }

  cell& create_cell() { return *(new cell()); }
  cell& create_cell( auto value ) { return *(new cell(value)); }
  channel& create_channel() { return *(new channel()); }
  //channel& create_item() { return *(new item()) }
  io_item& create_io_item() { return *(new io_item()); }
  react& create_react(auto action) { return *(new react(action)); }
  binding& create_binding(auto src, auto tgt) { return *(new binding(src,tgt)); }

  void attach( auto host, auto name, auto obj ) {}

}

