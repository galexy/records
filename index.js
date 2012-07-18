/**
 * Module dependencies
 */
var express = require('express');
var mongo = require('mongodb');
var inflection = require('inflection');

var Server = mongo.Server;
var Db = mongo.Db;
var ObjectID = mongo.ObjectID;

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
  app.use(express.bodyParser());
  app.use(express.static(__dirname + '/public'));
});

app.set('view engine', 'jade')
app.set('view options', {layout: false});

app.error(function(err, req, res, next) {
  console.log(err);
  
  next(err);
})

function loadMetadata(req, res, next) {
  db.collection('_metadata', function(err, collection) {
    if (err) return res.send(500);
    if (!collection) return res.send(500);
    
    collection.findOne({name: req.params.list}, function(err, metadata) {
      if (err) return res.send(500);
      if (!metadata) return res.send(404);
      
      req.metadata = metadata;
      
      next();
    })
  })
}

/**
 * List view
 */
app.get('/lists/:list', loadMetadata, function(req, res) {
  res.render('list', { 
    list: req.params.list,
    metadata: req.metadata,
  });
})

/**
 * List Admin View
 */
app.get('/lists/:list/admin', loadMetadata, function(req, res) {
  res.render('admin', {
    list: req.params.list,
    metadata: req.metadata,
  })
})

/**
 * REST API Routes
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

app.get   ('/api/metadata/lists/:list', loadMetadata, function(req, res) {
  res.send(req.metadata, {'Content-Type': 'application/json'}, 200);
})

app.put   ('/api/metadata/lists/:list', function(req, res) {
  db.collection('_metadata', function(err, collection) {
    if (err) return res.send(500);
    if (!collection) return res.send(500);
    
    collection.update({name: req.params.list}, {'$set': req.body}, {safe: true}, function(err, count) {
      if (err) return res.send(500);
      
      if (1 == count) {
        collection.findOne({name: req.params.list}, function(err, doc) {
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