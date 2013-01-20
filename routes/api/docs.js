
module.exports = function(db) {
  return {
    listDocuments: function(req, res) {
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
    },
    
    getDocumentMetadata: function(req, res) {
      db.collection(req.params.library + '.files', function(err, collection) {
        if (err) return res.send(500);

        collection.findOne({"metadata.name": req.params.document}, function(err, document) {
          if (err) return res.send(500);

          if (!document) return res.send(404);

          res.json(document.metadata);
        })
      })
    },
    
    saveDocumentMetadata: function(req, res) {
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
    },
    
  };
};