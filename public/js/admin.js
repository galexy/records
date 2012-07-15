/* Author:

*/

$(function() {
  /**************************
   * Models
   **************************/

  var Field = Backbone.Model.extend({
        
  })
  
  var FieldCollection = Backbone.Collection.extend({
    model: Field,

    initialize: function() {
      var multiSelect = new Backbone.Picky.MultiSelect(this);
      _.extend(this, multiSelect);
    },
  })

  var Settings = Backbone.Model.extend({
    idAttribute: 'name',
    
    urlRoot: '/api/metadata/lists',
    
    initialize: function(attributes) {
      console.log('in initialize')
      
      if (attributes.hasOwnProperty('fields')) {
        var fields = attributes.fields;
        
        var fieldCollection = new FieldCollection(fields);
        
        this.set('fields', fieldCollection);
      }
    },
  })
  
  var FieldView = Backbone.View.extend({
    tagName: 'tr',
    
    template: $('#fieldTemplate').text(),
    
    initialize: function() {
      
    },
    
    render: function() {
      this.$el.html(Mustache.render(this.template, this.model.toJSON()));
      // if (this.model.selected) {
      //   this.$('input[type="checkbox"].selector').attr('checked', true);
      // }
      
      return this;
    },
  })
  
  var SettingsView = Backbone.View.extend({
    el: $('#admin-view'),
    
    initialize: function() {
      this.table = this.$('tbody');
      
      this._modelBinder = new Backbone.ModelBinder();
      this.render();
    },
    
    render: function() {
      var self = this;
      
      this._modelBinder.bind(this.model, this.$('#details'));
      this.model.get('fields').each(function(field) {
        var fieldView = new FieldView({
          model: field
        });
        
        self.table.append(fieldView.render().el);
      })
    }
  })
  
  var settings = new Settings({
    name: 'passwords',
    title: 'Passwords',
    description: 'List of passwords',
    
    fields: [
      {
        name: 'name',
        heading: 'Name',
        placeholder: 'Account Name',
        type: 'Name',
        formType: 'text',
        required: true,
        default: '',
      },
      {
        name: 'url',
        heading: 'Website',
        placeholder: 'http://www.someplace.com',
        type: 'Url',
        formType: 'url',
        required: true,
        default: '',
      },
      {
        name: 'username',
        heading: 'User Name',
        placeholder: 'john@doe.com',
        type: 'String',
        formType: 'text',
        required: false,
      },
      {
        name: 'password',
        heading: 'Password',
        placeholder: 'password',
        type: 'String',
        formType: 'text',
        required: false,
      }
    ]
  });
  
  var settingsView = new SettingsView({
    model: settings
  });
})