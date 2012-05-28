/* Author:

*/

Application = Em.Application.create({
  listName: 'Accounts',
  
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
        console.log(value);
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


