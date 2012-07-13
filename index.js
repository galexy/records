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

app.set('view engine', 'ejs')

app.error(function(err, req, res, next) {
  console.log(err);
  
  next(err);
})

function loadMetadata(req, res, next) {
  req.metadata = {
    name: 'passwords',
    title: 'Passwords',
    description: 'List of passwords',
    
    fields: {
      name: {
        heading: 'Name',
        placeholder: 'Account Name',
        type: 'Name',
        formType: 'text',
        required: true,
      },
    
      url: {
        heading: 'Website',
        placeholder: 'http://www.someplace.com',
        type: 'Url',
        formType: 'url',
        required: true,
      },
    
      username: {
        heading: 'User Name',
        placeholder: 'john@doe.com',
        type: 'String',
        formType: 'text',
        required: false,
      },
    
      password: {
        heading: 'Password',
        placeholder: 'password',
        type: 'String',
        formType: 'text',
        required: false,
      }
    }
  };
  
  next();
}

app.get('/lists/:list', loadMetadata, function(req, res) {
  res.render('list', { 
    list: req.params.list,
    metadata: req.metadata,
  });
})

app.get('/lists/:list/script.js', loadMetadata, function(req, res) {
  var baseClassName = inflection.classify(req.metadata.name);
  
  res.contentType('text/javascript');
  res.render('script', { 
    layout: false, 
    list: req.params.list, 
    metadata: req.metadata,
    modelClassName: baseClassName,
    listClassName: baseClassName + 'List',    
  });
})

app.get('/lists.json/:list/metadata', loadMetadata, function(req, res) {
  res.send(req.metadata, 200);
})

app.get('/lists.json/:list', function(req, res) {
  db.collection(req.params.list, function(err, collection) {
    var stream = collection.find().stream();
    var list = [];

    stream.on('close', function() {
      res.send(list, { 'Content-Type': 'application/json'}, 200);
    })
    
    stream.on('data', function(data) {
      list.push(data);
    })
  })
})

app.post('/lists.json/:list', function(req, res) {
  console.log('posting to list: ' + req.params.list);
  
  if (!req.is('application/json'))
    return res.send(400);
  
  db.collection(req.params.list, function(err, collection) {
    collection.insert(req.body, {safe: true}, function(err, result) {
      if (err)
        return res.send(500);
      
      res.header('Location', '/lists/' + req.params.list + '/' + result[0]._id);
      return res.send(result[0], { 'Content-Type': 'application/json' }, 201);
    });
  });
});

app.get('/lists.json/:list/:item', function(req, res) {
  db.collection(req.params.list, function(err, collection) {
    if (err)
      return res.send(500);
    
    collection.findOne({_id: new ObjectID(req.params.item)}, function(err, doc) {
      if (err)
        return res.send(500);
      
      if (!doc)
        return res.send(404);
      
      res.send(doc, { 'Content-Type': 'application/json'}, 200);
    });
  });
});

app.delete('/lists.json/:list/:item', function(req, res) {
  db.collection(req.params.list, function(err, collection) {
    if (err)
      return res.send(500);
      
    collection.remove({_id: new ObjectID(req.params.item)}, function(err, count) {
      if (err)
        return res.send(500);
        
      if (0 == count)
        return res.send(404);
        
      return res.send({});
    })
  })
})

app.put('/lists.json/:list/:item', function(req, res) {
  if (!req.is('application/json'))
    return res.send(400);
  
  db.collection(req.params.list, function(err, collection) {
    console.log('Updating ' + req.params.item + ' with ');
    console.log(req.body);
    if (req.body.hasOwnProperty('_id')) delete req.body._id;

    collection.update({_id: new ObjectID(req.params.item)}, { '$set': req.body }, {safe: true}, function(err, count) {
      if (err) {
        console.log(err);
        return res.send(500);
      }

      if (count == 1) {
        collection.findOne({_id: new ObjectID(req.params.item)}, function(err, doc) {
          if (err) return res.send(500);
          
          return res.send(doc, { 'Content-Type': 'application/json' }, 200);
        })
      }
      else {
        return res.send(404);
      }
    });
  });
});

var port = process.env['PORT'] || 3000;
app.listen(port);
console.log('listening on port ' + port);