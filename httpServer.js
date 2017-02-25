var util = require('util');
var path = require('path');
var http = require('http');
var fs   = require('fs');
var server = http.createServer();

server.on('request', function (req,res) {
  var file = path.normalize('.' + req.url);

  fs.exists(file, function(exists) {
    if (exists) {
      var rs = fs.createReadStream(file);

      rs.on('error', function() {
        res.writeHead(500);
        res.end('Internal Server Error');
      });


      res.writeHead(200); // ok status
      rs.pipe(res);
    }
    else {
      res.writeHead(404); // error status
      res.end('NOT FOUND');
    }
  });

});

server.listen(4000);
