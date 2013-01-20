var mongo = require('mongodb');
var GridStore = mongo.GridStore;

module.exports = function(db) {
  return {

    allLibraries: function(req, res) {
      req.nav.steps = [ { active: true, title: 'Documents' } ];

      res.render('libraries', {
        nav: req.nav,
      })
    },

    getLibrary: function(req, res) {
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
    },

    getDocument: function(req, res) {
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
    },
    
    uploadDocument: function(req, res) {
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
    },

    deleteDocument: function(req, res) {
      GridStore.exist(db, req.params.document, req.params.library, function(err, result) {
        if (err) return res.send(500);
        if (!result) return res.send(404);
        
        GridStore.unlink(db, req.params.document, { root: req.params.library }, function(err, result) {
          if (err) return res.send(500);
          
          return res.send(200);
        });
      });
    }
  };
}
