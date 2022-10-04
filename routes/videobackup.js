var express = require('express');
var router = express.Router();
var url = require('url');
var fs = require('fs');

router.get('/:resource', function(request, response){
  var parsedUrl = url.parse(request.url);
  var resource = parsedUrl.pathname;

  var resourcePath = './video'+ resource;

  console.log(resourcePath);

  var stream = fs.createReadStream(resourcePath);
  var count = 0;

  stream.on('data', function(data){
    count = count + 1;
    response.write(data);
  });

  stream.on('end', function() {
    console.log('end streaming');
    console.log('data count = '+count);
    response.end();
  });

  stream.on('error', function(error){
    console.log(error);
    response.end('500 Internal Server '+error);
  });
});

module.exports = router;
