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
        },
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
        'click .namefield'                      : 'nameclick',
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
      
      nameclick: function(e) {
        e.stopPropagation();
      },
      
      selected: function(e) {
        this.$('input[type="checkbox"].selector').attr('checked', true);
      },

      deselected: function(e) {
        this.$('input[type="checkbox"].selector').attr('checked', false);
      },      
    });
    
    exports.NewDocumentView = Backbone.View.extend({
      el: $('#newDocumentModal'),

      events: {
        'click #addDocumentCancel'  : 'cancel',
        'click #addDocumentSubmit'  : 'submit',
        'submit #newDocumentForm'   : 'submit',
        'shown'                     : 'shown',
        'hidden'                    : 'onHidden',
        'change input[type="file"]' : 'fileChange'
      },

      initialize: function(attributes) {
        this._modelBinder = new Backbone.ModelBinder();
        this.library = attributes.library;
        this.render();
      },

      render: function() {
        this._modelBinder.bind(this.model, this.el);
      },

      show: function() {
        this.$el.modal('show');
      },

      shown: function() {
        this.$('input').first().focus();
      },

      onHidden: function() {
        this.model.set(this.model.defaults());
      },
      
      fileChange: function(e) {
        var file = e.target.files[0];
        
        this.model.set('name', file.fileName);
      },

      cancel: function(e) {
        this.$el.modal('hide');
      },

      submit: function(e) {
        var self = this;
        
        e.preventDefault();
        
        var file = this.$("input[type='file']")[0].files[0];
        var fileName = this.model.get('name');
        
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', '/docs/records/' + fileName, true);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = function(e) {
          if (this.status == 200) {
            console.log(this.response);

            var newModelJson = self.model.toJSON();
            delete newModelJson._file;
            self.library.create(newModelJson);
            self.$el.modal('hide');
          }
        };
        xhr.send(file);
      },
    });
    
    exports.LibraryView = Backbone.View.extend({
      el: $('#libraryview'),

      events: {
        'click #addDocument'        : 'addNewDocument',
      },
      
      initialize: function(attributes) {
        this.library = new attributes.collectionType;
        
        this.table = this.$('tbody');
        
        this.newDocumentView = new exports.NewDocumentView({
          model: new attributes.modelType,
          library: this.library,
        })
        
        this.library.on('add', this.addOne, this);
        this.library.on('reset', this.addAll, this);
        this.library.on('all', this.render, this);
        this.library.on('select:some', this.selectedSome, this);
        this.library.on('select:all', this.selectedAll, this);
        this.library.on('select:none', this.deselected, this);

        this.library.fetch();
      },
      
      render: function() {
        return this;
      },
      
      addNewDocument: function() {
        this.newDocumentView.show();
      },

      addOne: function(item) {
        var view = new exports.DocumentView({
          model: item
        });
        this.table.append(view.render().el);
      },

      addAll: function() {
        this.library.each($.proxy(this.addOne, this));
      },
      
      enableDeleteButton: function() {
        this.$('#delete')
          .removeClass('disabled')
          .removeAttr('disabled');
      },

      disableDeleteButton: function() {
        this.$('#delete')
          .addClass('disabled')
          .attr('disabled', 'disabled');
      },

      enableEditButton: function() {
        this.$('#editItem')
          .removeClass('disabled')
          .removeAttr('disabled');
      },

      disableEditButton: function() {
        this.$('#editItem')
          .addClass('disabled')
          .attr('disabled', 'disabled');
      },

      selectedSome: function(e) {
        this.enableDeleteButton();
        if (this.library.selectedLength == 1) {
          this.enableEditButton();
        }
        else {
          this.disableEditButton();
        }
      },

      selectedAll: function(e) {
        this.enableDeleteButton();
        if (this.library.selectedLength == 1) {
          this.enableEditButton();
        }
        else {
          this.disableEditButton();
        }
      },

      deselected: function(e) {
        this.disableDeleteButton();
        this.disableEditButton();
      },

      toggleSelectAll: function(e) {
        this.library.toggleSelectAll();
      }      
    });
    
    
  })(window.Libraries);
  
})