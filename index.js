/**
 * Module dependencies
 */
var express = require('express');
var mongo = require('mongodb');
var inflection = require('inflection');

var Server = mongo.Server;
var Db = mongo.Db;
var ObjectID = mongo.ObjectID;
var GridStore = mongo.GridStore;

var server = new Server('localhost', 27017, { auto_reconnect: true });
var db = new Db('records', server);

db.open(function(err, db) {
  if (!err) {
    console.log('Connected to database');
  }
});

var app = express.createServer();

app.configure(function () {
  app.use(express.logger());
  app.use(express.methodOverride());
  app.use(express.bodyParser({
    keepExtensions: true, 
    uploadDir: __dirname + "/public/uploads"
  }));
  app.use(express.staticCache());
  app.use(express.compress());
  app.use(express.static(__dirname + '/public'));
});

app.set('view engine', 'jade')
app.set('view options', {layout: false});

app.error(function(err, req, res, next) {
  console.log(err);
  console.log(err.stack);
  
  next(err);
})

function loadMetadata(req, res, next) {
  var type, name;
  if (req.params.hasOwnProperty('list')) {
    type = 'list';
    name = req.params.list;
  }
  else if (req.params.hasOwnProperty('library')) {
    type = 'library';
    name = req.params.library;
  }

  console.log('searching for metadata of type ' + type + ' for ' + name);
  
  db.collection('_metadata', function(err, collection) {
    if (err) return res.send(500);
    if (!collection) return res.send(500);
    
    collection.findOne({type: type, name: name}, function(err, metadata) {
      if (err) return res.send(500);
      if (!metadata) {
        console.log('could not find metadata')
        return res.send(404);
      }
      
      req.metadata = metadata;
      
      next();
    })
  })
}

function loadNav(req, res, next) {
  db.collection('_metadata', function(err, collection) {
    if (err) return res.send(500);
    if (!collection) return res.send(500);

    req.nav = {
      lists: [],
      libraries: [],
      pages: [],
    };
    
    var stream = collection.find().stream();
    
    stream.on('data', function(metadata) {
      if (metadata.type == 'list') {
        req.nav.lists.push({
          name: metadata.name, 
          title: metadata.title,
        });
      } else if (metadata.type == 'library') {
        req.nav.libraries.push({
          name: metadata.name,
          title: metadata.title
        })
      } else if (metadta.type == 'page') {
        req.nav.pages.push({
          name: metadata.name,
          title: metadata.title
        })
      }
    })

    stream.on('close', function() {
      next();
    })
            
  })
}

/**
 * List view
 */
app.get('/lists/:list', loadMetadata, loadNav, function(req, res) {
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
})

/**
 * Library
 */

app.get('/docs/:library', loadMetadata, loadNav, function(req, res) {
  req.nav.libraries.forEach(function(library) {
    if (library.name == req.params.library)
      library.active = true;
  })
  
  req.nav.steps = [
    { url: '/docs', title: 'Documents' },
    { url: '/docs' + req.params.library, title: req.metadata.title },
    { active: true, title: 'Standard'}
  ];
  
  res.render('library', {
    nav: req.nav,
    library: req.params.library,
    metadata: req.metadata,
  });
})

app.get('/docs/:library/:document', function(req, res) {
  GridStore.exist(db, req.params.document, req.params.library, function(err, result) {
    if (err) return res.send(500);
    if (!result) return res.send(404);

    console.log('file exists');

    var file = new GridStore(db, req.params.document, 'r', {
      root: req.params.library
    });
    
    console.log(file);
    
    file.open(function(err, file) {
      if (err) return res.send(500);
      
      console.log('file opened');
      
      console.log(file.contentType);
      res.contentType(file.contentType);
      res.header['Content-Disposition'] = 'inline';
      
      var stream = file.stream(true);
      
      stream.on('data', function(chunk) { 
        console.log('sending chunk');
        res.write(chunk); 
      });
      stream.on('end', function() {
        console.log('sending end');
        res.end(); 
      });
      stream.on('close', function() {
        console.log('close');
      })
    })
  })
})

app.put('/docs/:library/:document', function(req, res) {
  if (req._body) {
    return res.send(400);
  }
  
  var file = new GridStore(db, req.params.document, 'w', {
    root: req.params.library, 
    metadata: {
      name: req.params.document
    },
    content_type: req.headers['content-type'],
  });
  
  var length = parseInt(req.headers['content-length']);
  var buffers = [];
  
  req.on('data', function(chunk) { 
    buffers.push(chunk);
  });

  req.on('end', function() {
    file.open(function(err, file) {
      if (err) return res.send(500);

      var writeLength = 0;
      var writeCount = 0;
      buffers.forEach(function(buffer) {
        file.write(buffer, function(err, file) {
          writeLength += buffer.length;
          
          if (++writeCount == buffers.length) {
            file.close(function(err, result) {
              res.statusCode = (writeLength == length) ? 200 : 500;
              res.end();
            })
          }
        });
      })
    })
  })
})

/**
 * List Admin View
 */
app.get('/admin/lists/:list', loadMetadata, loadNav, function(req, res) {
  req.nav.steps = [
    { url: '/lists', title: 'Lists' },
    { url: '/lists' + req.params.list, title: req.metadata.title },
    { active: true, title: 'Settings'}
  ];
  
  res.render('admin', {
    nav: req.nav,
    metadata: req.metadata,
  })
})

app.get('/admin/docs/:library', loadMetadata, loadNav, function(req, res) {
  req.nav.steps = [
    { url: '/docs', title: 'Documents' },
    { url: '/docs' + req.params.library, title: req.metadata.title },
    { active: true, title: 'Settings' }
  ];

  res.render('admin', {
    nav: req.nav,
    metadata: req.metadata,
  })
})

/***************************************************************************
 * REST API Routes
 ***************************************************************************/
 
/**
 * Lists and items API
 */
app.all   ('/api/lists/:list', function(req, res, next) {
  db.collection(req.params.list, function(err, collection) {
    if (err) return res.send(500);
    
    req.collection = collection;
    next();
  })
}) 
 
app.get   ('/api/lists/:list', function(req, res) {
  var stream = req.collection.find().stream();
  var list = [];

  stream.on('close', function() {
    res.send(list, { 'Content-Type': 'application/json'}, 200);
  })
  
  stream.on('data', function(data) {
    list.push(data);
  })
})

app.post  ('/api/lists/:list', function(req, res) {
  console.log('posting to list: ' + req.params.list);
  
  if (!req.is('application/json')) return res.send(400);
  
  req.collection.insert(req.body, {safe: true}, function(err, result) {
    if (err) return res.send(500);
    
    res.header('Location', '/lists/' + req.params.list + '/' + result[0]._id);
    return res.send(result[0], { 'Content-Type': 'application/json' }, 201);
  });
});

app.all   ('/api/lists/:list/:item', function(req, res, next) {
  db.collection(req.params.list, function(err, collection) {
    if (err) return res.send(500);
    
    req.collection = collection;
    next();
  })
})

app.get   ('/api/lists/:list/:item', function(req, res) {
  req.collection.findOne({_id: new ObjectID(req.params.item)}, function(err, doc) {
    if (err) return res.send(500);
    if (!doc) return res.send(404);
    
    res.send(doc, { 'Content-Type': 'application/json'}, 200);
  });
});

app.put   ('/api/lists/:list/:item', function(req, res) {
  if (!req.is('application/json')) return res.send(400);
  
  console.log('Updating ' + req.params.item + ' with ');
  console.log(req.body);
  if (req.body.hasOwnProperty('_id')) delete req.body._id;

  req.collection.update({_id: new ObjectID(req.params.item)}, { '$set': req.body }, {safe: true}, function(err, count) {
    if (err) {
      console.log(err);
      return res.send(500);
    }

    if (count == 1) {
      req.collection.findOne({_id: new ObjectID(req.params.item)}, function(err, doc) {
        if (err) return res.send(500);
        
        return res.send(doc, { 'Content-Type': 'application/json' }, 200);
      })
    }
    else {
      return res.send(404);
    }
  });
})

app.delete('/api/lists/:list/:item', function(req, res) {
  req.collection.remove({_id: new ObjectID(req.params.item)}, function(err, count) {
    if (err) return res.send(500);
      
    if (0 == count) return res.send(404);
      
    return res.send({});
  })
})

/**
 * Library and document metadata API
 */
app.get   ('/api/libraries/:library', function(req, res) {
  db.collection(req.params.library + '.files', function(err, collection) {
    if (err) return res.send(500);
    
    var stream = collection.find().stream();
    var list = [];
    
    stream.on('data', function(data) {
      list.push(data.metadata);
    })
    
    stream.on('close', function() {
      res.json(list);
    })
  })
})

app.get   ('/api/libraries/:library/:document', function(req, res) {
  db.collection(req.params.library + '.files', function(err, collection) {
    if (err) return res.send(500);
    
    collection.findOne({"metadata.name": req.params.document}, function(err, document) {
      if (err) return res.send(500);
      
      if (!document) return res.send(404);
      
      res.json(document.metadata);
    })
  })
})

app.put   ('/api/libraries/:library/:document', function(req, res) {
  if (!req.body.name || req.body.name != req.params.document) return res.send(400);
  
  db.collection(req.params.library + '.files', function(err, collection) {
    if (err) return res.send(500);
    
    collection.update({"metadata.name": req.params.document}, {'$set': {metadata: req.body}}, {safe: true}, function(err, count) {
      if (err) return res.send(500);
      
      if (1 == count) {
        collection.findOne({"metadata.name": req.params.document}, function(err, doc) {
          if (err) return res.send(500);
          return res.json(doc.metadata);
        })
      }
      else {
        return res.send(404);
      }
    })
  })
})

app.get   ('/api/metadata/lists/:list', loadMetadata, function(req, res) {
  res.send(req.metadata, {'Content-Type': 'application/json'}, 200);
})

app.put   ('/api/metadata/lists/:list', function(req, res) {
  db.collection('_metadata', function(err, collection) {
    if (err) return res.send(500);
    if (!collection) return res.send(500);
    
    collection.update({type: 'list', name: req.params.list}, {'$set': req.body}, {safe: true}, function(err, count) {
      if (err) return res.send(500);
      
      if (1 == count) {
        collection.findOne({type: 'list', name: req.params.list}, function(err, doc) {
          if (err) return res.send(500);
          return res.send(doc, {'Content-Type': 'application/json'}, 200);
        })
      }
      else {
        return res.send(404);
      }
    })
  })
})

app.get   ('/api/metadata/libraries/:library', loadMetadata, function(req, res) {
  res.send(req.metadata, {'Content-Type': 'application/json'}, 200);
})

app.put   ('/api/metadata/libraries/:library', function(req, res) {
  db.collection('_metadata', function(err, collection) {
    if (err) return res.send(500);
    if (!collection) return res.send(500);
    
    collection.update({type: 'library', name: req.params.library}, {'$set': req.body}, {safe: true}, function(err, count) {
      if (err) return res.send(500);
      
      if (1 == count) {
        collection.findOne({type: 'library', name: req.params.list}, function(err, doc) {
          if (err) return res.send(500);
          return res.send(doc, {'Content-Type': 'application/json'}, 200);
        })
      }
      else {
        return res.send(404);
      }
    })
  })
})


var port = process.env['PORT'] || 3000;
app.listen(port);
console.log('listening on port ' + port);