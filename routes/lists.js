
module.exports = {
  all: function all(req, res) {
    req.nav.steps = [ { active: true, title: 'Lists' } ];

    res.render('lists', {
      nav: req.nav,
    });
  },

  getList: function(req, res) {
    req.nav.lists.forEach(function(list) {
      if (list.name == req.params.list)
        list.active = true;
    })

    
    req.nav.steps = [
      { url: '/lists', title: 'Lists' },
      { url: '/lists' + req.params.list, title: req.metadata.title },
      { active: true, title: 'Standard'}
    ];

    res.render('list', {
      nav: req.nav,
      list: req.params.list,
      metadata: req.metadata,
    });
  }
  
}