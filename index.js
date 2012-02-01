/**
 * Module dependencies
 */
var express = require('express');

var app = express.createServer();

app.configure(function() {
  app.use(express.static(__dirname + '/public'));
});

app.set('view engine', 'ejs');

app.get('/lists/:list', function(req, res){
    res.render('list', { title: req.params.list });
});

var port = process.env['PORT'] || 3000;
app.listen(port);
console.log('listening on port ' + port);