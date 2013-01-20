/**
 * Module dependencies
 */
var express = require('express');
var mongo = require('mongodb');
var inflection = require('inflection');

var Server = mongo.Server;
var Db = mongo.Db;

var server = new Server('localhost', 27017, { auto_reconnect: true });
var db = new Db('records', server);

db.open(function(err, db) {
  if (!err) {
    console.log('Connected to database');
  }
});

var app = express.createServer();

app.use(express.logger());
app.use(express.methodOverride());
app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + "/public/uploads" }));
app.use(express.static(__dirname + '/public'));

app.set('view engine', 'jade')
app.set('view options', { layout: false });

app.error(function(err, req, res, next) {
  console.log(err);
  console.log(err.stack);
  
  next(err);
})



/***************************************************************************
 * Front end Routes
 ***************************************************************************/
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

  db.collection('_metadata', function(err, collection) {
    if (err || !collection) return res.send(500);

    collection.findOne({type: type, name: name}, function(err, metadata) {
      if (err) return res.send(500);
      if (!metadata) {
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

    req.nav = { lists: [], libraries: [], pages: [] };

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

    stream.on('close', next);
  })
}

var lists = require('./routes/lists');
var docs  = require('./routes/docs')(db);
var admin = require('./routes/admin');
 
/* Lists */
app.get('/lists', loadNav, lists.all);
app.get('/lists/:list', loadMetadata, loadNav, lists.getList);

/* Libraries */
app.get   ('/docs', loadNav, docs.allLibraries);
app.get   ('/docs/:library', loadMetadata, loadNav, docs.getLibrary);
app.get   ('/docs/:library/:document', docs.getDocument);
app.put   ('/docs/:library/:document', docs.uploadDocument);
app.delete('/docs/:library/:document', docs.deleteDocument);

/* List Admin View */
app.get('/admin/lists/:list', loadMetadata, loadNav, admin.manageList);
app.get('/admin/newlist', loadNav, admin.newList);
app.get('/admin/docs/:library', loadMetadata, loadNav, admin.manageLibrary);
app.get('/admin/newlibrary', loadNav, admin.newLibrary);

/***************************************************************************
 * REST API Routes
 ***************************************************************************/
var api = {
  lists: require('./routes/api/lists')(db),
  docs: require('./routes/api/docs')(db),
  metadata: require('./routes/api/metadata')(db)
};

/* Lists */
app.all   ('/api/lists/:list', api.lists.loadCollection);
app.get   ('/api/lists/:list', api.lists.getAllItems);
app.post  ('/api/lists/:list', api.lists.addNewItem);
app.all   ('/api/lists/:list/:item', api.lists.loadCollection);
app.get   ('/api/lists/:list/:item', api.lists.getItem);
app.put   ('/api/lists/:list/:item', api.lists.updateItem);
app.delete('/api/lists/:list/:item', api.lists.deleteItem);

/* Library and document metadata API */
app.get   ('/api/libraries/:library', api.docs.listDocuments);
app.get   ('/api/libraries/:library/:document', api.docs.getDocumentMetadata);
app.put   ('/api/libraries/:library/:document', api.docs.saveDocumentMetadata);

/* Metadata api */
app.get   ('/api/metadata/lists', api.metadata.getAllListMetadata);
app.get   ('/api/metadata/libraries', api.metadata.getAllLibrariesMetadata);
app.get   ('/api/metadata/lists/:list', loadMetadata, api.metadata.getListMetadata);
app.put   ('/api/metadata/lists/:list', api.metadata.saveListMetadata);
app.get   ('/api/metadata/libraries/:library', loadMetadata, api.metadata.getLibraryMetadata);
app.put   ('/api/metadata/libraries/:library', api.metadata.saveLibraryMetadata);

var port = process.env['PORT'] || 3000;
app.listen(port);
console.log('listening on port ' + port);