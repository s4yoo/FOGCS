var express = require('express');
var router = express.Router();
var fs = require('fs');
var url = require('url');

router.get('/:resource', function(req, res){
  var parsedUrl = url.parse(req.url);
  var resource = parsedUrl.pathname;

  var resourcePath = './resourceFile'+ resource;

  fs.readFile(resourcePath,function(error, data){
    res.writeHead(200, {'Content-type': 'text/html' });
    res.end(data);
  });
});

module.exports = router;
