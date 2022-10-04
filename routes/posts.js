var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var util = require('../util');
var request = require('request');
var fetch = require("node-fetch");

var salt=10;

var client = mysql.createConnection({
  user: 'root',
  password: '1234',
  database: 'homework'
});

router.get('/', async function(req, res){
  var searchText = req.query.searchText;
  var post = req.flash('post')[0] || {};
  var errors = req.flash('errors')[0] || {};
  if(!searchText){
    client.query('select count(*) as count from post', async function(error, rCount){
      var page = Math.max(1, parseInt(req.query.page));
      var limit = Math.max(1, parseInt(req.query.limit));

      page = !isNaN(page)?page:1;
      limit = !isNaN(limit) ? limit: 10;

      var skip = (page - 1) * limit;

      var count = await rCount[0].count;

      var maxPage = Math.ceil(count/limit);
      await client.query('select * from post order by number desc limit ?, ?',[skip, limit], function (error, result){
        res.render('posts/index', {
          posts: result,
          currentPage: page,
          maxPage: maxPage,
          limit: limit,
          searchType: req.query.searchType,
          searchText: req.query.searchText,
          errors: errors
        });
      });
    });
  } else {
    searchText = '%'+ searchText + '%';
    searchType = req.query.searchType;
    client.query('select count(*) as count from post where ?? like ?', [searchType, searchText], async function(error, rCount){
      var page = Math.max(1, parseInt(req.query.page));
      var limit = Math.max(1, parseInt(req.query.limit));

      page = !isNaN(page)?page:1;
      limit = !isNaN(limit) ? limit: 10;

      var skip = (page - 1) * limit;

      var count = await rCount[0].count;

      var maxPage = Math.ceil(count/limit);
      await client.query('select * from post where ?? like ? order by number desc limit ?, ?',[searchType, searchText, skip, limit], function (error, result){
        res.render('posts/index', {
          posts: result,
          currentPage: page,
          maxPage: maxPage,
          limit: limit,
          searchType: req.query.searchType,
          searchText: req.query.searchText,
          errors: errors
        });
      });
    });
  }
});

//new
router.get('/new', function(req, res){
  var post = req.flash('post')[0] || {};
  var errors = req.flash('errors')[0] || {};
  client.query('select name from gamelist', function(error, name){
    res.render('posts/new', {post:post, errors:errors, header: name});
  });
});

// create
router.post('/', function(req, res){
  var password = req.body.password
  var errors = {};
  var isValid = true;

  if(!req.body.title){
    isValid = false;
    errors.title = 'Title is Required!';
  }
  if(!req.body.name){
    isValid = false;
    errors.name = 'Name is Required!';
  }
  if(!req.body.password){
    isValid = false;
    errors.password = 'Password is Required!';
  }
  if(!req.body.body){
    isValid = false;
    errors.body = "Content is Required!";
  }
/*  if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null){
    isValid = false;
    errors.captcha = "Please check Recaptcha";
    req.flash('errors', errors);
    //return res.redirect('/posts/new' + res.locals.getPostQueryString());
  }*/

  // Secret Key
  var secretKey = '6Lf_mcYZAAAAALM7yGHlRkf3iFf3WwkqQKaEPAlI';

  // Verify URL
  var verifyUrl= 'https://google.com/recaptcha/api/siteverify?secret='+secretKey+'&response='+req.body['g-recaptcha-response']+'&remoteip='+req.connection.remoteAddress;

  request(verifyUrl, function(error, response, body){
    body = JSON.parse(body);

    if(body.success !== undefined && !body.success){
      errors.captcha = "Please check Recaptcha";
      isValid = false;
      //return res.json({"responseError" : "Failed captcha verification"});
    }
  });

  /*request(verifyUrl, (err, response, body) => {//리다이렉트가 작동을 안함, 캡처가 안되어도 작동함
    body = JSON.parse(body);

    console.log(body);
    // If not successful
    if(!body.success){
      errors.captcha = "Please check Recaptcha";
      isValid = false;
    }
  });*/
  //console.log(req.body.header);
  if(isValid){
    bcrypt.hash(password, salt, function(err, hash){
      client.query('insert into post (title, body, password, name, header) value (?, ?, ?, ?, ?)', [req.body.title, req.body.body, hash, req.body.name, req.body.header], function(err, post){
        if(err) {
          req.flash('post', req.body);
          req.flash('errors', util.parseError(err));
          return res.redirect('/posts/new' + res.locals.getPostQueryString());
        }
         return res.redirect('/posts' + res.locals.getPostQueryString(false, {page:1, searchText:''}));
      });
    });
  } else {
    req.flash('errors', errors);
    return res.redirect('/posts/new' + res.locals.getPostQueryString());
  }
});

//show
router.get('/:number', function(req, res){
  var commentForm = req.flash('commentForm')[0] || {_id: null, form: {}};
  var commentError = req.flash('commentError')[0] || { _id: null, parentComment: null, errors:{}};
  var errors = req.flash('errors')[0] || {};



  client.query('select * from post where number = ?', [req.params.number], function(err, post){
    client.query('select * from comment where Pid = ? order by createdAt', [req.params.number], function(err, comments){
      var commentTrees = util.convertToTrees(comments, 'id', 'parentComment', 'childComment');
      client.query('UPDATE post SET view = view + 1 WHERE number = ?',[req.params.number]);
      if(err) return res.json(err);
      //console.log(comments)
      res.render('posts/show', {
        post:post[0],
        commentTrees: commentTrees,
        commentForm: commentForm,
        commentError: commentError,
        errors: errors
      });
    });
    //console.log(post);
  });
});

//edit
router.get('/:number/edit', checkPermission, function(req, res){
  var post = req.flash('post')[0];
  var errors = req.flash('errors')[0] || {};
  if(!post){
    client.query('select name from gamelist', function(error, name){
      client.query('select * from post where number = ?', [req.params.number], function(err, post){
        if(err) return res.josn(err);
      /*  client.query('select name from gamelist', function(error, name){
          res.render('posts/edit', {post:post, errors:errors, header: name});
        });*/
        res.render('posts/edit', {post:post[0], errors:errors, header: name});
      });
    });
  } else{
    post.number=req.params.number;
    res.render('posts/edit', {post:post, errors:errors});
  }
});

//update
router.put('/:number', checkPermission, function(req, res){
  var password = req.body.password
  var errors = {};
  var isValid = true;

  if(!req.body.title){
    isValid = false;
    errors.title = 'Title is Required!';
  }
  if(!req.body.name){
    isValid = false;
    errors.name = 'Name is Required!';
  }
  if(!req.body.password){
    isValid = false;
    errors.password = 'Password is Required!';
  }
  if(!req.body.body){
    isvalid = false;
    errors.body = "Content is Required!";
  }

  if(isValid){
    bcrypt.hash(password, salt, function(err, hash){
      client.query('update post set title = ?, body = ?, updateAt = now(), password = ?, name = ?, header = ? where number = ?',
        [req.body.title, req.body.body, hash, req.body.name, req.body.header, req.params.number], function(err, post) {
          if(err) {
            req.flash('post', req.body);
            req.falsh('errors', util.parseError(err));
            return res.redirect('/post/'+req.params.number+'/edit' + res.locals.getPostQueryString());
          }
          return res.redirect("/posts/" + req.params.number + res.locals.getPostQueryString());
      });
    });
  } else {
    req.flash('errors', errors);
    return res.redirect('/posts/'+ req.params.number +'/edit' + res.locals.getPostQueryString());
  }

});

//delete
router.delete('/:number', util.isLoggedin, function(req, res){
  client.query('delete from comment where Pid = ?', [req.params.number], function(error){
    client.query('delete from post where number = ?', [req.params.number], function(err){
      if(err) return res.json(err);
      return res.redirect('/posts');
    });
  });
});

module.exports = router;

function checkPermission(req, res, next){
  if(req.session.postNumber.Number != req.params.number) return util.noPermission(req, res);
  next();
}
/*
function createSearchQuery(queries){
  var searchQuery={};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(',');
    var postQueries = [];
    if(searchTypes.indexOf('title') >= 0){
      postQueries.push({ title: {$regex: new RegExp(queries.searchText, 'i')}});
    }
    if(searchTypes.indexOf('body') >= 0){
      postQueries.push({ body: {$regex: new RegExp(queries.searchText, 'i')}});
    }
    if(postQueries.length > 0) searchQuery = {$or:postQueries};
  }
  return searchQuery;
}
*/
