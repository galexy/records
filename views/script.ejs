/* Author:

*/

Application = Em.Application.create({
  listName: 'Passwords',
  
  ready: function() {
    Application.accountsController.fill();
    
    $('#addItemModal').modal();
    $('#addItemModal').on('hidden', function() {
      Application.addItemModal.hide();
    });
  }
});

/**************************
 * Models
 **************************/

Application.Account = Em.Object.extend({
  name: '',
  url: '',
  username: '',
  password: '',
  securityQuestion: '',
  securityAnswer: ''
});

/**************************
 * Array Controllers
 **************************/
Application.accountsController = Em.ArrayProxy.create({
  content: [],
  
  fill: function() {
    var me = this;
    
    $.getJSON('/lists/passwords/all.json', function(data) {
      $(data).each(function(index, value) {
        var account = me.addItem(value);
      });
    });
  },
  
  addItem: function(account) {
    var newAccount = Application.Account.create(account);
    this.pushObject(newAccount);
  },

  postNewItem: function(account) {
    var me = this;
    
    $.ajax({
      url: '/lists/passwords', 
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(account),
      success: function(result, status, xhr) {
        var path = xhr.getResponseHeader('Location');
        var id = path.split('/').pop();
        var newAccount = Application.Account.create(account);
        newAccount.set('_id', id);
        me.pushObject(newAccount);
        
        Application.addItemView.hide();
      }
    });
  },
});

/*************************
 * Views
 *************************/
Application.ListView = Em.View.extend({
  listNameBinding: 'Application.listName',
  
  refresh: function(event) {
    alert('refresh');
  },
  
  addItem: function(event) {
    $('#addItemModel input:first').focus();
    $('#addItemModal').modal('show');
  },
}); 
 
Application.ItemView = Em.View.extend({
  nameBinding: 'content.name',
  urlBinding: 'content.url',
  usernameBinding: 'content.username',
  passwordBinding: 'content.password',
});

Application.addItemView = Em.View.extend({
  account: Application.Account.create(),
  
  hide: function() {
    this.clearInputs();
    $('#addItemModal').modal('hide');
  },
  
  change: function(event) {
    var account = this.get('account');
    
    if ('' != account.get('name') || '' != account.get('url') || '' != account.get('username') || '' != account.get('password'))
      $('#addItemModal .submit').removeClass('disabled');
    else
      $('#addItemModal .submit').addClass('disabled');
  },
  
  cancel: function() {
    this.hide();
  },
  
  submit: function() {
    Application.accountsController.postNewItem(this.get('account'));
  },
  
  clearInputs: function() {
    var account = this.get('account');
    account.set('name', '');
    account.set('url', '');
    account.set('username', '');
    account.set('password', '');
  }
});