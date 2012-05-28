/* Author:

*/

Application = Em.Application.create({
  listName: 'Passwords',
  
  ready: function() {
    Application.accountsController.fill();
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
        var account = me.createAccount(value);
      });
    });
  },
  
  createAccount: function(account) {
    var newAccount = Application.Account.create(account);
    this.pushObject(newAccount);
  },

});

/*************************
 * Views
 *************************/
Application.ItemView = Em.View.extend({
  nameBinding: 'content.name',
  urlBinding: 'content.url',
  usernameBinding: 'content.username',
  passwordBinding: 'content.password',
});

