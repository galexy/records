/* Author:

*/

Application = Ember.Application.create({
  listName: 'Accounts',
  
  ready: function() {
    
  }
});

/**************************
 * Models
 **************************/

Application.Account = Ember.Object.extend({
  name: '',
  url: '',
  userName: '',
  password: '',
  securityQuestion: '',
  securityAnswer: ''
});

/**************************
 * Array Controllers
 **************************/
Application.accountsController = Ember.ArrayController.create({
  content: [],
  init: function() {
    var account = Application.Account.create({
      name: 'Amazon',
      url: 'http://www.amazon.com',
      userName: 'john@doe.com'
      password: 'password',
    });
    this.pushObject(account);
    
    var account2 = Application.Account.create({
      name: 'Netflix',
      url: 'http://www.netflix.com',
      userName: 'jane@doe.com'
      password: 'foobar',
    });
    this.pushObject(account2);
  },
  
  changeData: function(event) {
    this.content[0].set('password', 'Foo');
  },
});

/*************************
 * Views
 *************************/


