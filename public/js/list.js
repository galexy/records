/* Author:

*/

$(function() {

  window.Lists = window.Lists || {};

  (function(exports) {

    /**************************
     * Model Factory
     **************************/

    exports.ListModelFactory = function(defaultValues) {
      return Backbone.Model.extend({
        defaults: function() {
          return defaultValues;
        },
        
        idAttribute: '_id',
        
        initialize: function() {
          var selectable = new Backbone.Picky.Selectable(this);
          _.extend(this, selectable);
        }
      })
    };
    
    exports.ListCollectionFactory = function(Model, url) {
      return Backbone.Collection.extend({
        model: Model,

        url: url,

        initialize: function() {
          var multiSelect = new Backbone.Picky.MultiSelect(this);
          _.extend(this, multiSelect);
        }
      });
    };

    exports.ItemView = Backbone.View.extend({

      tagName: 'tr',

      template: $('#listItemTemplate').text(),

      events: {
        'click input[type="checkbox"].selector' : 'select',
        'click .namefield'                      : 'edit',
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

      edit: function(e) {
        e.preventDefault();
        e.stopPropagation();
        var editView = new Lists.EditItemView({
          model: this.model
        });
      },

      selected: function(e) {
        this.$('input[type="checkbox"].selector').attr('checked', true);
      },

      deselected: function(e) {
        this.$('input[type="checkbox"].selector').attr('checked', false);
      },
    });

    exports.NewItemView = Backbone.View.extend({
      el: $('#newItemModal'),

      events: {
        'click #addItemCancel'  : 'cancel',
        'click #addItemSubmit'  : 'submit',
        'submit #newItemForm'   : 'submit',
        'shown'                 : 'shown',
        'hidden'                : 'onHidden',
      },

      initialize: function(attributes) {
        this._modelBinder = new Backbone.ModelBinder();
        this.list = attributes.list;
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

      cancel: function(e) {
        this.$el.modal('hide');
      },

      submit: function(e) {
        e.preventDefault();
        this.list.create(this.model.toJSON());
        this.$el.modal('hide');
      },
    });
    
    exports.EditItemView = Backbone.View.extend({
      el: $('#editItemModal'),

      events: {
        'shown'                   : 'onShown',
        'hide'                    : 'onHide',
        'click #editItemCancel'   : 'onCancel',
        'click #editItemSubmit'   : 'submit',
        'submit #editItemForm'    : 'submit',
      },

      initialize: function() {
        this._modelBinder = new Backbone.ModelBinder();

        this.render();
        this.model.on('change', this.onChanged, this);

        this.$el.modal('show');
        this.processCancel = true;
      },

      render: function() {
        this._modelBinder.bind(this.model, this.el);
      },

      onShown: function() {
        this.$('input').first().focus();
      },

      onHide: function() {
        this._modelBinder.unbind();
        this.model.off(null, this.onChanged, this);
        this.undelegateEvents();

        if (this.processCancel) this.cancel();
      },

      onChanged: function() {
        this.revert || (this.revert = {});

        for (var field in this.model.changedAttributes()) {
          if (this.revert.hasOwnProperty(field)) continue;

          this.revert[field] = this.model.previous(field);
        }
      },

      onCancel: function(e) {
        this.cancel();
        this.$el.modal('hide');
      },

      cancel: function() {
        if (this.revert) {
          this.model.off(null, this.onChanged, this);
          this.model.set(this.revert);
        }

        this.processCancel = false;
      },

      submit: function(e) {
        e.preventDefault();
        var self = this;

        this.model.save({}, {
          success: function(model, response) {
            self.processCancel = false;
            self.$el.modal('hide');
          }
        })
      }
    });
    
    exports.AppView = Backbone.View.extend({
      el: $('#listview'),

      events: {
        'click #refresh'        : 'refresh',
        'click #addItem'        : 'addNewItem',
        'click #delete'         : 'delete',
        'click #selectAll'      : 'toggleSelectAll',
        'click #editItem'       : 'editItem',
      },

      initialize: function(attributes) {
        
        this.list = new attributes.listType;

        this.table = this.$('tbody');

        this.newItemView = new Lists.NewItemView({
          model: new attributes.modelType
        });

        // bind model events
        this.list.on('add', this.addOne, this);
        this.list.on('reset', this.addAll, this);
        this.list.on('all', this.render, this);
        this.list.on('select:some', this.selectedSome, this);
        this.list.on('select:all', this.selectedAll, this);
        this.list.on('select:none', this.deselected, this);

        this.list.fetch();
      },

      render: function() {
        return this;
      },

      refresh: function(e) {

      },

      addNewItem: function(e) {
        this.newItemView.show();
      },

      delete: function(e) {
        // TODO: pop up a confirmation dialog
        for(var i in this.list.selected) {
          var selected = this.list.selected[i];
          selected.deselect();
          selected.destroy({wait: true});
        }
      },

      editItem: function(e) {
        for (var i in this.list.selected) {
          var editView = new Lists.EditItemView({
            model: this.list.selected[i]
          });
        }
      },

      addOne: function(item) {
        var view = new Lists.ItemView({
          model: item
        });
        this.table.append(view.render().el);
      },

      addAll: function() {
        this.list.each($.proxy(this.addOne, this));
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
        if (this.list.selectedLength == 1) {
          this.enableEditButton();
        }
        else {
          this.disableEditButton();
        }
      },

      selectedAll: function(e) {
        this.enableDeleteButton();
        if (this.list.selectedLength == 1) {
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
        this.list.toggleSelectAll();
      }
    });

  })(window.Lists);
}) 
