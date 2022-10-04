var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var passport = require('../config/passport');
var util = require('../util');
var multer = require('multer');
var upload = multer({ dest: 'video/' });

var client = mysql.createConnection({
  user: 'root',
  password: '1234',
  database: 'homework'
});

var field, pid;
// Home
router.get('/', async function(req, res){
  var searchText = req.query.searchText;
  if(!searchText){
    client.query('select count(*) as count from gamelist', async function(error, rCount){
      var page = Math.max(1,parseInt(req.query.page));
      var limit = Math.max(1, parseInt(req.query.limit));

      page = !isNaN(page) ? page:1;
      limit = !isNaN(limit) ? limit : 10;

      var skip = (page -1) * limit;

      var count = await rCount[0].count;

      var maxPage = Math.ceil(count / limit);
      await client.query('select * from gamelist order by id desc limit ?, ?', [skip, limit], function (error, result){
        res.render('home/index', {
          data: result,
          currentPage: page,
          maxPage: maxPage,
          limit: limit,
          searchText: req.query.searchText
        });
      });
    });
  } else {
    searchText = '%' + searchText + '%';
    client.query('select count(*) as count from gamelist where name like ?', [searchText], async function(error, rCount){
      var page = Math.max(1,parseInt(req.query.page));
      var limit =Math.max(1, parseInt(req.query.limit));

      page = !isNaN(page) ? page:1;
      limit = !isNaN(limit) ? limit : 10;

      var skip = (page -1) * limit;

      var count = await rCount[0].count;

      var maxPage = Math.ceil(count / limit);
      await client.query('select * from gamelist where name like ? order by id desc limit ?, ?', [searchText, skip, limit], function (error, result){
        res.render('home/index', {
          data: result,
          currentPage: page,
          maxPage: maxPage,
          limit: limit,
          searchText: req.query.searchText
        });
      });
    });
  }
});

//new
router.get('/home/new', util.isLoggedin, function(req, res){
  var post = req.flash('post')[0] || {};
  var errors = req.flash('errors')[0] || {};
  res.render('home/new', {post:post, errors:errors});
});

//create
router.post('/', util.isLoggedin, function(req,res){
  client.query('insert into gamelist (name, date) value (?, ?)', [req.body.title, req.body.date], function(err, date){
    if(err){
      console.log(err);
      return res.redirect('/home/new');
    }
    res.redirect('/');
  });
});

//select
router.get('/home/:id/select', function(req, res){
  client.query('select distinct cpu from gameinfo where gnumber = ?', [req.params.id], function(err,cpu){
    if(err){
      console.log(err);
      return res.redirect('/');
    }
    client.query('select distinct gpu from gameinfo where gnumber = ?', [req.params.id], function(err, gpu){
      if(err){
        console.log(err);
        return res.redirect('/');
      }
      client.query('select distinct resolution from gameinfo where gnumber = ?', [req.params.id], function(err,resolution){
        if(err){
          console.log(err);
          return res.redirect('/');
        }
        client.query('select * from gamelist where id = ?', [req.params.id], function(err, name){
          if(err){
            console.log(err)
            return res.redirect('/');
          }
          res.render('home/select', {
            cpu: cpu,
            gpu: gpu,
            resolution: resolution,
            title: name[0]
          });
        });
      });
    });
  });
});

//cpu,gpu,resolution add
router.get('/home/:id/add', util.isLoggedin, function(req, res){
  var cpu = req.flash('cpu')[0];
  var gpu = req.flash('gpu')[0];
  var errors = req.flash('errors')[0] || {};
  client.query('select name from gamelist where id = ?', [req.params.id], function(err, title){
    res.render('home/add', {
      title: title[0],
      id: req.params.id,
      errors: errors,
      cpu: cpu,
      gpu: gpu
    });
  });
});


router.post('/home/:id', util.isLoggedin, function(req,res){
  var body = req.body;
  var isValid = true;
  var errors = {};
  if((req.body.cpu == '') && !req.file){
    isValid = false;
    errors.cpu = 'CPU is Required!';
  }
  if((req.body.gpu == '') && !req.file){
    isValid = false;
    errors.gpu = 'GPU is Required!';
  }
  if(isValid){
    client.query('insert into gameinfo (gnumber, cpu, gpu, resolution) values (?, ?, ?, ?)', [req.params.id, body.cpu, body.gpu, body.resolution], function(err){
      if(err){
        return res.redirect('/home/'+ req.params.id + '/select');
      }
      res.redirect('/home/' + req.params.id + '/select');
    });
  } else {
    req.flash('errors', errors);
    res.redirect('/home/' + req.params.id + '/add');
  }
});

//result
router.post('/home/:id/result', function(req, res){
  var body = req.body;
  client.query('select * from fieldName', function(err, fieldName){
    client.query('select name from gamelist where id = ?', [req.params.id], function(err, title){
      client.query('create or replace view result as select * from gameinfo where cpu = ? and gpu = ? and resolution = ? and gnumber = ?', [body.cpu, body.gpu, body.resolution, req.params.id], function(err){
        client.query('select * from result',function(err, result){
          console.log(result[0].numId);
          if(result){
            pid = result[0].numId;
            client.query('select * from file where postId = ?', [result[0].numId], function(err, file){
              if(err){
                console.log(err);
                return res.redirect('/home/' + req.params.id + '/select');
              }
              if(result[0] != null){
                var string = JSON.stringify(result);
                string = string.replace("[", "");
                string = string.replace("]", "");
                result = JSON.parse(string);
                field = Object.keys(result);
              }
              if(fieldName[0] != null){
                var string = JSON.stringify(fieldName);
                string = string.replace("[", "");
                string = string.replace("]", "");
                fieldName = JSON.parse(string);
                //field = Object.keys(result);
              }
              return res.render('home/result', {
                fieldName: fieldName,
                data: result,
                id: req.params.id,
                title: title[0],
                cpu: body.cpu,
                gpu: body.gpu,
                resolution: body.resolution,
                file: file[0]
              });
            });
          }
        });
      });
    });
  });
});

//resultEdit
router.get('/home/:id/resultEdit', util.isLoggedin, function(req, res){
  var errors = req.flash('errors')[0] || {};
  client.query('select * from fieldName', function(err, fieldName){
    client.query('select * from gameinfo where numId = ?', [req.params.id], function(err, result){
      if(result[0] != null){
        var string = JSON.stringify(result);
        string = string.replace("[", "");
        string = string.replace("]", "");
        result = string;
        result = JSON.parse(result);
      }

      client.query('select name from gamelist where id = ?', [result.gnumber], function(err, title){
        client.query('select * from file where postId = ?', [req.params.id], function(err, file){
          if(err){
            console.log(err);
            return res.redirect('/home/' + result.gnumber + '/result');
          }
          /*if(result[0] != null){
            var string = JSON.stringify(result);
            string = string.replace("[", "");
            string = string.replace("]", "");
            result = string;
            result = JSON.parse(result);
          }*/
          if(fieldName[0] != null){
            var string = JSON.stringify(fieldName);
            string = string.replace("[", "");
            string = string.replace("]", "");
            fieldName = JSON.parse(string);
            //field = Object.keys(result);
          }
        //  console.log(file[0].originalFileName);
          return res.render('home/resultEdit', {
            fieldName: fieldName,
            data: result,
            id: result.gnumber,
            title: title[0],
            errors: errors,
            file: file[0]
          });
        });
      });
    });
  });
});

router.post('/home/:id/resultEdit', util.isLoggedin, upload.single('newAttachment'), function(req, res){
  var errors = {};
  var isValid = true;
  var string = JSON.stringify(req.body);
  string = string.replace("[", "");
  string = string.replace("]", "");
  result = string;
  result = JSON.parse(result);

  if((req.body.attachment == '') && !req.file){
    isValid = false;
    errors.attachment = 'Video is Required!';
  }

  if(isValid){
    client.query('select * from fieldName', function(err, fieldName){
      if(fieldName[0] != null){
        var string = JSON.stringify(fieldName);
        string = string.replace("[", "");
        string = string.replace("]", "");
        fieldName = JSON.parse(string);
        //field = Object.keys(result);
      }
      client.query('select name from gamelist where id = ?', [req.params.id], function(err, title){
        //console.log('resultEdit부분pid: '+pid);
        client.query('select * from file where postId = ? and isDelete = 0', [pid], function(err, file){
          if(file[0]){
            if(req.file || !req.body.attachment) {
              client.query('update file set isDelete = 1 where postId = ? and serverFileName = ?', [pid, file[0].serverFileName]);
              var attachment = req.file;
              //  console.log(attachment);
              client.query('insert into file (originalFileName, serverFileName, size, postId) values (?, ?, ? ,?)', [attachment.originalname, attachment.filename, attachment.size, pid], function(err) {
                if(err) return console.log(err);
                client.query('select * from file where postId = ? and isDelete = 0', [pid], function(err, file){
                  if(err) return console.log(err);
                  /*return res.render('home/result',{
                    data: result,
                    id: req.body.gnumber,
                    title: title[0],
                    cpu: req.body.cpu,
                    gpu: req.body.gpu,
                    resolution: req.body.resolution,
                    file: file[0],
                    fieldName: fieldName
                  });*/
                });
              });
            }
          } else {
            if(req.file || !req.body.attachment) {
              //client.query('update file set isDelete = 1 where postId = ? and serverFileName = ?', [pid, file[0].serverFileName]);
              var attachment = req.file;
              //  console.log(attachment);
              client.query('insert into file (originalFileName, serverFileName, size, postId) values (?, ?, ?, ?)', [attachment.originalname, attachment.filename, attachment.size, pid], function(err) {
                if(err) return console.log(err);
                client.query('select * from file where postId = ? and isDelete = 0', [pid], function(err, file){
                  if(err) return console.log(err);
                  /*return res.render('home/result',{
                    data: result,
                    id: req.body.gnumber,
                    title: title[0],
                    cpu: req.body.cpu,
                    gpu: req.body.gpu,
                    resolution: req.body.resolution,
                    file: file[0],
                    fieldName: fieldName
                  });*/
                });
              });
            }
          }
        });

        field.forEach(function(field, index){
          if(result[field] != ''){
            //console.log(field +': ' +result[field]);
            if(result[field] == 'True'){
              client.query('update gameinfo set ?? = true where numId = ?', [field, pid], function(err){
                if(err) console.log(err);
              });
            } else if(result[field] == 'False') {
              client.query('update gameinfo set ?? = false where numId = ?', [field, pid], function(err){
                if(err) console.log(err);
              });
            } else {
              client.query('update gameinfo set ?? = ? where numId = ?', [field, result[field], pid], function(err){
                if(err) console.log(err);
              });
            }
          }
        });

        client.query('select * from file where postId = ? and isDelete = 0', [pid], function(err, file){
          if(err) return console.log(err);
          /*return res.render('home/result',{
            data: result,
            id: req.body.gnumber,
            title: title[0],
            cpu: req.body.cpu,
            gpu: req.body.gpu,
            resolution: req.body.resolution,
            file: file[0],
            fieldName: fieldName
          });*/
          return res.redirect('/home/'+req.params.id+'/select');
        });

      });
    });
  } else {
    req.flash('errors', errors);
    return res.redirect('/home/' + pid + '/resultEdit');
  }
});

//Field add

router.get('/home/:id/FieldAdd', util.isLoggedin, function(req, res){
  client.query('select * from fieldName', function(err, fieldName){
    if(err) return console.log(err);
    client.query('select * from gameinfo where numid = ?', [req.params.id], function(err, gameinfo){
      if(err) return console.log(err);
      var result;
      if(gameinfo[0] != null){
        var string = JSON.stringify(gameinfo);
        //console.log(string);
        string = string.replace("[", "");
        string = string.replace("]", "");
        result = string;
        result = JSON.parse(result);
      }
      //console.log(result);
      client.query('select * from gamelist where id = ?', [gameinfo[0].gnumber], function(err, title){
        if(err) return console.log(err);
        res.render('home/fieldAdd',{
          id: gameinfo[0].numId,
          title: title[0],
          fieldName: fieldName[0],
          data: result
        });
      });
    });
  });
});

router.post('/home/:id/FieldAdd', util.isLoggedin, function(req, res){
  var body = req.body;
  var string = JSON.stringify(req.body);
  string = string.replace("[", "");
  string = string.replace("]", "");
  var result = string;
  result = JSON.parse(string);

  if(body.addField){
    client.query('alter table fieldName add ?? text', [body.addField]);
    client.query('alter table gameinfo add ?? text', [body.addField]);
    client.query('update fieldName set ?? = ? where num = 0', [body.addField, body.addFieldName]);
  }

  field.forEach(function(field, index){
    client.query('update fieldName set ?? = ? where num = 0', [field, result[field]], function(err){
      if(err) console.log(err);
    });
  });

  return res.redirect('/home/' + req.params.id + '/FieldAdd');
});

//Delete
router.delete('/home/:id', util.isLoggedin, function(req, res){
  client.query('select * from gameinfo where gnumber = ? and cpu = ? and gpu = ? and resolution = ?',
  [req.params.id, req.body.cpu, req.body.gpu, req.body.resolution], function(err, id){
    client.query('delete from file where postId = ?', [id[0].numId], function(err){
      if(err) return res.json(err);
    });
    client.query('delete from gameinfo where numId = ?',
    [id[0].numId], function(err){
      if(err) return res.json(err);
      res.redirect('/home/'+ req.params.id +'/select');
    });
  });
});

//Login
router.get('/login', function (req, res){
  var username = req.flash('username')[0];
  var errors = req.flash('errors')[0] || {};
  res.render('home/login', {
    username: username,
    errors: errors
  });
});

router.post('/login', function(req, res, next){
  var errors = {};
  var isValid = true;

  if(!req.body.username){
    isValid = false;
    errors. username = 'Username is Required!';
  }
  if(!req.body.password){
    isValid = false;
    errors.password = 'Password is required!';
  }

  if(isValid){
    next();
  } else {
    req.flash('errors', errors);
    res.redirect('/login');
  }
}, passport.authenticate('local-login', {
  successRedirect : '/',
  failureRedirect : '/login'
}));

//logout
router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/')
});

module.exports = router;
