/**
 * Module dependencies
 */
var express = require('express');
var mongo = require('mongodb');

var Server = mongo.Server;
var Db = mongo.Db;
var ObjectID = mongo.ObjectID;

var server = new Server('localhost', 27017, { auto_reconnect: true });
var db = new Db('records', server);

// db.open(function(err, db) {
//   if (!err) {
//     console.log('Connected to database');
//   }
// });

var app = express.createServer();

app.configure(function() {
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.static(__dirname + '/public'));
});

app.set('view engine', 'ejs')

function loadMetadata(req, res, next) {
  req.metadata = {
    title: 'Passwords',
    name: 'passwords',
    single: 'password',
    className: 'Password',
    
    fields: {
      name: {
        heading: 'Name',
        placeholder: 'Account Name',
        type: 'String',
        required: true,
      },
    
      url: {
        heading: 'Website',
        placeholder: 'http://www.someplace.com',
        type: 'Url',
        required: true,
      },
    
      username: {
        heading: 'User Name',
        placeholder: 'john@doe.com',
        type: 'String',
        required: false,
      },
    
      password: {
        heading: 'Password',
        placeholder: 'password',
        type: 'String',
        required: false,
      }
    }
  };
  
  next();
}

app.get('/lists/:list', loadMetadata, function(req, res) {
  res.render('list', { list: req.params.list, metadata: req.metadata });
})

app.get('/lists/:list/metadata.json', loadMetadata, function(req, res) {
  res.send(req.metadata, 200);
})

app.get('/lists/:list/script.js', loadMetadata, function(req, res) {
  res.render('script', { layout: false, list: req.params.list, metadata: req.metadata });
})

app.get('/lists/:list/all.json', function(req, res) {
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

app.post('/lists/:list', function(req, res) {
  console.log('posting to list: ' + req.params.list);
  
  if (!req.is('application/json')) {
    return res.send(400);
  }
  
  db.collection(req.params.list, function(err, collection) {
    collection.insert(req.body, {safe: true}, function(err, result) {
      if (err) {
        return res.send(500);
      }
      
      res.header('Location', '/lists/' + req.params.list + '/' + result[0]._id);
      return res.send(201);
    });
  });
});

app.get('/lists/:list/:item.json', function(req, res) {
  db.collection(req.params.list, function(err, collection) {
    if (err) {
      return res.send(500);
    }
    
    collection.findOne({_id: new ObjectID(req.params.item)}, function(err, doc) {
      if (err) {
        return res.send(500);
      }
      
      if (!doc) {
        return res.send(404);
      }
      
      res.send(doc, { 'Content-Type': 'application/json'}, 200);
    });
  });
});

app.put('/lists/:list/:item.json', function(req, res) {
  if (!req.is('application/json')) {
    return res.send(400);
  }
  
  db.collection(req.params.list, function(err, collection) {
    console.log('Updating ' + req.params.item + ' with ');
    console.log(req.body);
    collection.update({_id: new ObjectID(req.params.item)}, { '$set': req.body }, {safe: true}, function(err, result) {
      console.log(result);
      return res.send(err ? 500 : 200);
    });
  });
});

var port = process.env['PORT'] || 3000;
app.listen(port);
console.log('listening on port ' + port);