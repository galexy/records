
module.exports = {
  manageList: function(req, res) {
    req.nav.steps = [
      { url: '/lists', title: 'Lists' },
      { url: '/lists/' + req.params.list, title: req.metadata.title },
      { active: true, title: 'Settings'}
    ];

    res.render('admin', {
      nav: req.nav,
      metadata: req.metadata,
    })
  },
  
  newList: function(req, res) {
    req.nav.steps = [
      { url: '/lists', title: 'Lists' },
      { active: true, title: 'New'}
    ];

    res.render('admin', {
      nav: req.nav,
      metadata: {
        name: '',
        title: '',
        description: '',
        type: 'list',
        fields: [
          { 
            "name" : "name",
            "heading" : "Name",
            "placeholder" : "Name",
            "type" : "Name",
            "required" : true,
            "default" : "",
          },
        ],
      }
    })
  },
  
  manageLibrary: function(req, res) {
    req.nav.steps = [
      { url: '/docs', title: 'Documents' },
      { url: '/docs/' + req.params.library, title: req.metadata.title },
      { active: true, title: 'Settings' }
    ];

    res.render('admin', {
      nav: req.nav,
      metadata: req.metadata,
    })
  },
  
  newLibrary: function(req, res) {
    req.nav.steps = [
      { url: '/docs', title: 'Documents' },
      { active: true, title: 'New'}
    ];

    res.render('admin', {
      nav: req.nav,
      metadata: {
        name: '',
        title: '',
        description: '',
        type: 'library',
        fields: [
          { 
            "name" : "name",
            "heading" : "Name",
            "placeholder" : "File Name",
            "type" : "Name",
            "required" : true,
            "default" : "",
          },
        ],
      }
    })
  }
}