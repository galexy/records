var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;

module.exports = function(db) {
  return {
    loadCollection: function(req, res, next) {
      db.collection(req.params.list, function(err, collection) {
        if (err) return res.send(500);

        req.collection = collection;
        next();
      })
    },
    
    getAllItems: function(req, res) {
      var stream = req.collection.find().stream();
      var list = [];

      stream.on('close', function() {
        res.send(list, { 'Content-Type': 'application/json'}, 200);
      })

      stream.on('data', function(data) {
        list.push(data);
      })
    },
    
    addNewItem: function(req, res) {
      console.log('posting to list: ' + req.params.list);

      if (!req.is('application/json')) return res.send(400);

      req.collection.insert(req.body, {safe: true}, function(err, result) {
        if (err) return res.send(500);

        res.header('Location', '/lists/' + req.params.list + '/' + result[0]._id);
        return res.send(result[0], { 'Content-Type': 'application/json' }, 201);
      });
    },
    
    getItem: function(req, res) {
      req.collection.findOne({_id: new ObjectID(req.params.item)}, function(err, doc) {
        if (err) return res.send(500);
        if (!doc) return res.send(404);

        res.send(doc, { 'Content-Type': 'application/json'}, 200);
      });
    },
    
    updateItem: function(req, res) {
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
    },
    
    deleteItem: function(req, res) {
      req.collection.remove({_id: new ObjectID(req.params.item)}, function(err, count) {
        if (err) return res.send(500);

        if (0 == count) return res.send(404);

        return res.send({});
      })
    }
  };
};