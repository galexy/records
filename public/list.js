$(function() {
  Backbone.sync = (function() {
    var count = 0;

    return function sync(method, model) {
      model.id = ++count;
    }
  })();
  
  var ListItem = Backbone.Model.extend({

    aMethod: function aMethod(arg1) {
      return arg1;
    },
    
    foo: 1,
  
  });

  var item = new ListItem({v: 1});
  var item2 = new ListItem({v: 2});
  
  item.save();
  item.save({v: 34});
});