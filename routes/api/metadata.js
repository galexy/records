
module.exports = function(db) {
  function findMetadata(type, req, res) {
    db.collection('_metadata', function(err, collection) {
      if (err) return res.send(500);

      var stream = collection.find({ type: type }).sort({ name: 1 }).stream();
      var lists = [];

      stream.on('data', function(data) {
        delete data.fields;
        lists.push(data);
      })
      stream.on('close', function() {
        res.json(lists);
      })
    })
  }

  function saveItemMetadata(type, name, req, res) {
    db.collection('_metadata', function(err, collection) {
      if (err) return res.send(500);
      if (!collection) return res.send(500);

      collection.update({type: type, name: name}, {'$set': req.body}, {safe: true, upsert: true}, function(err, count) {
        if (err) return res.send(500);

        collection.findOne({type: type, name: name}, function(err, doc) {
          if (err) return res.send(500);
          return res.json(doc);
        })
      })
    })
  }

  return {
    getAllListMetadata: function(req, res) {
      findMetadata('list', req, res);
    },
    
    getAllLibrariesMetadata: function(req, res) {
      findMetadata('library', req, res);
    },
    
    getListMetadata: function(req, res) {
      res.json(req.metadata);
    },
    
    saveListMetadata: function(req, res) {
      saveItemMetadata('list', req.params.list, req, res);
    },
    
    getLibraryMetadata: function(req, res) {
      res.json(req.metadata);
    },
    
    saveLibraryMetadata: function(req, res) {
      saveItemMetadata('library', req.params.library, req, res);
    }
  };
};