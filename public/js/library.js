$(function() {
  
  window.Libraries = window.Libraries || {};
  
  (function(exports) {

    /**
     * Model Factories
     */

    exports.DocumentModelFactory = function() {
      function dateFields(model) {
        return _.filter(model.constructor.metadata.fields, function(field) {
          return field.type == 'Date'
        });
      }
      
      return Backbone.Model.extend({
        defaults: function() {
          return this.constructor.metadata.defaults;
        },
        
        idAttribute: 'name',
        
        initialize: function() {
          var selectable = new Backbone.Picky.Selectable(this);
          _.extend(this, selectable);
        },
        
        destroy: function(options) {
          this.trigger('destroy', this, this.collection, options);
        },
        
        parse: function(response) {
          dateFields(this).forEach(function(field) {
            if (response.hasOwnProperty(field.name) && response[field.name]) {
              response[field.name] = new Date(response[field.name]);
            }
          })
          return response;
        },
        
        toJSON: function() {
          var json = Backbone.Model.prototype.toJSON.call(this);
          dateFields(this).forEach(function(field) {
            if (json.hasOwnProperty(field.name) && json[field.name] instanceof Date) {
              json[field.name] = json[field.name].valueOf();
            }
          })
          return json;
        },

        upload: function(file, success) {
          var self = this;
          var fileName = this.get('name');
          var urlPath = '/docs/' + this.constructor.metadata.name + '/' + fileName;

          var xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', function(e) {
            self.set('_progress', Math.round((e.position / e.total) * 100));
          }, false);
          xhr.upload.addEventListener('load', function(e) {
            self.set('_progress', 'Finishing')
            self.unset('_progressNumber')
          }, false);
          xhr.onload = function(e) {
            if (this.status == 200 && success) {
              self.set('_progress', 'Uploaded')
              success();
            }
          };
          xhr.open('PUT', urlPath, true);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);

          this.set('_progress', 0);
          this.set('_progressNumber', true);
        }
      })
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
      
      template: Handlebars.compile($('#documentTemplate').text()),
      
      events: {
        'click input[type="checkbox"].selector' : 'select',
        'click'                                 : 'select',
        'dblclick'                              : 'edit',
        'click .namefield'                      : 'nameclick',
      },

      initialize: function() {
        this.model.on('change', this.render, this);
        this.model.on('destroy', this.remove, this);
        this.model.on('selected', this.selected, this);
        this.model.on('deselected', this.deselected, this);
      },

      render: function() {
        this.$el.html(this.template(this.model.attributes));
        this.$('input[type="checkbox"].selector').attr('checked', this.model.selected);

        return this;
      },
      
      select: function(e) {
        e.stopPropagation();
        this.model.toggleSelected();
      },

      edit: function(e) {
        var editView = new exports.EditDocumentView({
          model: this.model
        });
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
    
    function metaConverter(parse, format) {
      return function(direction, value) {
        switch (direction) {
          case 'ModelToView':
            return (format) ? format(value) : value;
          case 'ViewToModel':
            return parse(value);
        }
      }
    }

    var numberConverter = metaConverter(function(value) { 
      return Number(value); 
    })

    var dateConverter = metaConverter(function(value) {
      if (!value || '' == value) return null;
      
      return new Date(Date.parse(value));
    },
    function(value) {
      if (!value || !(value instanceof Date)) return "";

      return (value.getMonth() + 1) + "/" + value.getDate() + "/" + (value.getFullYear());
    })

    var booleanConverter = metaConverter(function(value) {
      return Boolean(value); 
    })
    
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
        this.fileInput = this.$('input[type="file"]').get(0);
      },

      render: function() {
        var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'name');

        this.model.constructor.metadata.fields.forEach(function(field) {
          switch (field.type) {
            case 'Number':
              bindings[field.name].converter = numberConverter;
              break;
            case 'Date':
              bindings[field.name].converter = dateConverter;
              break;
            case 'Boolean':
              bindings[field.name].converter = booleanConverter;
              break;
          }
        })

        this._modelBinder.bind(this.model, this.el, bindings);
      },

      show: function() {
        this.$el.modal('show');
      },

      shown: function() {
        this.$('input').first().focus();
      },

      onHidden: function() {
        this._modelBinder.unbind();
        this.undelegateEvents();
        
        this.fileInput.value = '';
      },
      
      fileChange: function(e) {
        var file = this.fileInput.files[0];
        this.model.set('name', file.name);
      },

      cancel: function(e) {
        this.$el.modal('hide');
      },

      submit: function(e) {
        var self = this;

        e.preventDefault();

        var file = this.$("input[type='file']")[0].files[0];

        self.model.upload(file, function() {
          self.model.unset('_progressNumber');
          self.model.unset('_file');

          var newModelJson = self.model.toJSON();
          self.library.create(newModelJson);
          self.$el.modal('hide');
        });
      },
    });
    
    exports.EditDocumentView = Backbone.View.extend({
      el: $('#editDocumentModal'),

      events: {
        'shown'                       : 'onShown',
        'hide'                        : 'onHide',
        'click #editDocumentCancel'   : 'onCancel',
        'click #editDocumentSubmit'   : 'submit',
        'submit #editDocumentForm'    : 'submit',
      },

      initialize: function() {
        this._modelBinder = new Backbone.ModelBinder();

        this.render();
        this.model.on('change', this.onChanged, this);

        this.$el.modal('show');
        this.processCancel = true;
      },

      render: function() {
        var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'name');
        
        this.model.constructor.metadata.fields.forEach(function(field) {
          switch (field.type) {
            case 'Number':
              bindings[field.name].converter = numberConverter;
              break;
            case 'Date':
              bindings[field.name].converter = dateConverter;
              break;
            case 'Boolean':
              bindings[field.name].converter = booleanConverter;
              break;
          }
        })
        
        this._modelBinder.bind(this.model, this.el, bindings);
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
    
    exports.LibraryView = Backbone.View.extend({
      el: $('#appview'),

      events: {
        'click #addDocument'        : 'addNewDocument',
        'click #editDocument'       : 'editDocument',
        'click #deleteDocument'     : 'deleteDocument',
        'dragenter .document-area'  : 'dragenter',
        'dragover .document-area'   : 'dragover',
        'drop .document-area'       : 'dropFiles',
        'click .heading'            : 'sortBy'
      },
      
      initialize: function(attributes) {
        this.modelType = attributes.modelType;
        this.library = new attributes.collectionType;
        
        this.table = this.$('tbody');
        
        this.library.on('add', this.addOne, this);
        this.library.on('reset', this.addAll, this);
        this.library.on('sort', this.addAll, this);
        this.library.on('all', this.render, this);
        this.library.on('select:some', this.selectedSome, this);
        this.library.on('select:all', this.selectedAll, this);
        this.library.on('select:none', this.deselected, this);

        this.library.fetch();

        this.uploadStatusView = new exports.UploadStatusView({
          library: this.library,
          modelType: this.modelType
        });
      },
      
      render: function() {
        return this;
      },

      sortBy: function(e) {
        var index = this.$el.find('thead th span').index(e.target);
        var fieldName = this.modelType.metadata.fields[index].name;
        this.library.comparator = fieldName;
        this.library.sort();
      },
      
      addNewDocument: function() {
        var newDocumentView = new exports.NewDocumentView({
          model: new this.modelType,
          library: this.library,
        })
        
        newDocumentView.show();
      },
      
      editDocument: function() {
        for (var i in this.library.selected) {
          var editView = new exports.EditDocumentView({
            model: this.library.selected[i]
          });
        }
      },
      
      deleteDocument: function() {
        // TODO: add consent
        // TODO: add status bar
        var me = this;

        function deleteDocumentRecursive(selected, keys) {
          var documentId = keys.shift();
          var document = selected[documentId];
          
          var url = encodeURI('/docs/' + document.constructor.metadata.name + '/' + document.get('name'));
          
          request
            .del(url)
            .end(function(res) {
              // TODO: handle error
              document.destroy();
                            
              if (keys.length)
                deleteDocumentRecursive(selected, keys);
            });
        }
        
        deleteDocumentRecursive(this.library.selected, Object.keys(this.library.selected));
      },

      dragenter: function(e) {
        e.stopPropagation();
        e.preventDefault();
      },

      dragover: function(e) {
        e.originalEvent.dataTransfer.dropEffect = "copy";

        e.stopPropagation();
        e.preventDefault();
      },

      dropFiles: function(e) {
        e.stopPropagation();
        e.preventDefault();

        e = e.originalEvent;

        this.uploadStatusView.upload(e.dataTransfer.files);
      },

      addOne: function(item) {
        var view = new exports.DocumentView({
          model: item
        });
        this.table.append(view.render().el);
      },

      addAll: function() {
        this.table.empty();
        this.library.each($.proxy(this.addOne, this));
      },
      
      enableDeleteButton: function() {
        this.$('#deleteDocument')
          .removeClass('disabled')
          .removeAttr('disabled');
      },

      disableDeleteButton: function() {
        this.$('#deleteDocument')
          .addClass('disabled')
          .attr('disabled', 'disabled');
      },

      enableEditButton: function() {
        this.$('#editDocument')
          .removeClass('disabled')
          .removeAttr('disabled');
      },

      disableEditButton: function() {
        this.$('#editDocument')
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

    exports.UploadDocumentView = Backbone.View.extend({
      tagName: 'tr',

      template: Handlebars.compile($('#uploadDocumentTemplate').text()),

      initialize: function(attributes) {
        this.model.on('change', this.render, this);  
      },

      render: function() {
        this.$el.html(this.template(this.model.attributes));

        return this;
      }
    });

    exports.UploadStatusView = Backbone.View.extend({
      el: $('#uploadStatus'),

      initialize: function(attributes) {
        this.collection = new Backbone.Collection([], {
          url: attributes.library.url,
          model: attributes.modelType
        });
        this.library = attributes.library;

        this.collection.on('add', this.addFile, this);
      },

      events: {
        'click .close': 'hide'
      },

      render: function() {
        return this;
      },

      show: function() {
        this.$el.removeClass('hidden');
      },

      hide: function() {
        this.$el.addClass('hidden');
      },

      upload: function(files) {
        var self = this;

        this.show();
        files = Array.prototype.filter.call(files, function(e) { return true; });
        _.chain(files)
          .map(function(f) { return {name: f.name, _progress: 'Queued', _file: f} })
          .each(function(f) {
            var doc = self.collection.add(f);
          });
        this.uploadNext();
      },

      uploadNext: function() {
        var self = this;
        var nextToUpload = this.collection
          .chain()
          .filter(function(d) { return d.get('_progress') == 'Queued'; })
          .first()
          .value();

        if (nextToUpload) {
          nextToUpload.upload(nextToUpload.get('_file'), function() {
            nextToUpload.unset('_file');
            nextToUpload.unset('_progressNumber');
            self.library.add(nextToUpload);
            self.uploadNext();
          });
        }
      },

      addFile: function(document) {
        var view = new exports.UploadDocumentView({
          model: document
        });
        this.$('tbody').append(view.render().el);
      }
    })

  })(window.Libraries);
  
})