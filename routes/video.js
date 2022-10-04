var express = require('express');
var router = express.Router();
var url = require('url');
var fs = require('fs');

router.get('/:resource', function(request, response){
  var parsedUrl = url.parse(request.url);
  var resource = parsedUrl.pathname;

  var resourcePath = './video'+ resource;

  //console.log(resourcePath);

  var stream = fs.createReadStream(resourcePath);
  var count = 0;

  var movie = resourcePath;

  fs.stat(movie, function (err,stats){
    var range = request.headers.range;
    if(!range){
      return response.sendStatus(416);
    }

    var positions = range.replace(/bytes=/, "").split("-");
    var start = parseInt(positions[0], 10);
    var total = stats.size;
    var end =positions[1] ? parseInt(positions[1], 10) : total - 1;
    var chunksize = (end - start) + 1;

    response.writeHead(206, {
      'Transfer-Encoding' : 'chunked',
      "Content-Range" : "bytes " + start + "-" + end + "/" + total,
      "Accept-Ranges" : "bytes",
      "content_Length" : chunksize,
      //"Content-Type" : mine.lookup(resource)
    });

    var stream = fs.createReadStream(movie, {start: start, end: end, autoClose: true })
    .on('end', function (){
      console.log('Stream Done');
    })
    .on("error", function(err){
      response.end(err);
    })
    .pipe(response, { end: true });
  });
});

module.exports = router;
