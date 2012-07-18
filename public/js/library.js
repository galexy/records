$(function() {
  
  window.Libraries = window.Libraries || {};
  
  (function(exports) {
    
    /**
     * Model Factories
     */
    exports.DocumentModelFactory = function(defaultValues) {
      return Backbone.Model.extend({
        defaults: function() {
          return defaultValues;
        },
        
        idAttribute: 'name',
        
        initialize: function() {
          var selectable = new Backbone.Picky.Selectable(this);
          _.extend(this, selectable);
        }
      });
    };
    
    exports.DocumentCollectionFactory = function(Model, url) {
      return Backbone.Collection.extend({
        model: Model,

        url: url,

        initialize: function() {
          var multiSelect = new Backbone.Picky.MultiSelect(this);
          _.extend(this, multiSelect);
        }
      });
    };
    
    exports.DocumentView = Backbone.View.extend({
      tagName: 'tr',
      
      template: $('#documentTemplate').text(),
      
      events: {
        'click input[type="checkbox"].selector' : 'select',
        'click'                                 : 'select',
      },

      initialize: function() {
        this.model.on('change', this.render, this);
        this.model.on('destroy', this.remove, this);
        this.model.on('selected', this.selected, this);
        this.model.on('deselected', this.deselected, this);
      },

      render: function() {
        this.$el.html(Mustache.render(this.template, this.model.toJSON()));
        this.$('input[type="checkbox"].selector').attr('checked', this.model.selected);

        return this;
      },
      
      select: function(e) {
        e.stopPropagation();
        this.model.toggleSelected();
      },
      
      selected: function(e) {
        this.$('input[type="checkbox"].selector').attr('checked', true);
      },

      deselected: function(e) {
        this.$('input[type="checkbox"].selector').attr('checked', false);
      },      
    });
    
    exports.LibraryView = Backbone.View.extend({
      el: $('#libraryview'),

      events: {
        
      },
      
      initialize: function(attributes) {
        this.library = new attributes.collectionType;
        
        this.table = this.$('tbody');
        
        this.list.on('add', this.addOne, this);
        this.list.on('reset', this.addAll, this);
        this.list.on('all', this.render, this);
        // this.list.on('select:some', this.selectedSome, this);
        // this.list.on('select:all', this.selectedAll, this);
        // this.list.on('select:none', this.deselected, this);

        this.list.fetch();
      },
      
      render: function() {
        return this;
      },
      
      addOne: function(item) {
        var view = new exports.DocumentView({
          model: item
        });
        this.table.append(view.render().el);
      },

      addAll: function() {
        this.list.each($.proxy(this.addOne, this));
      },
    });
  })(window.Libraries);
  
})