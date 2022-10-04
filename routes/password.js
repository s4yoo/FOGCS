var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var util = require('../util');

var client = mysql.createConnection({
  user: 'root',
  password: '1234',
  database: 'homework'
});



router.get('/:number/edit', function(req, res){
  var errors = req.flash('errors')[0] || {};
  client.query('select title, number from post where number = ?', [req.params.number], function(error, result){
    res.render('password/edit', {post: result[0], errors: errors});
  });
});

router.post('/:number/edit', function(req, res, next){
  var password = req.body.password;
  var errors = {};
  var isValid = true;

  if(!req.body.password){
    isValid = false;
    errors.password = 'Password is required!';
  }
  if(isValid){
    client.query('select password from post where number = ?', [req.params.number], function(err, data){
      if(err) return res.json(err);
      bcrypt.compare(password, data[0].password, function(err, result){
        if(result){
          req.session.postNumber={
            Number: req.params.number
          }
          //console.log(req.session);
          res.redirect('/posts/'+[req.params.number]+'/edit' + res.locals.getPostQueryString());
        } else {
          req.flash('errors', {login: 'The password is incorrect.'});
          res.redirect('/password/' + req.params.number + '/edit' + res.locals.getPostQueryString());
        }
      });
    });
  } else {
    req.flash('errors', errors);
    res.redirect('/password/' + req.params.number + '/edit' + res.locals.getPostQueryString());
  }
});

router.get('/:number/delete', function(req, res){
  var errors = req.flash('errors')[0] || {};
  client.query('select * from post where number = ?', [req.params.number], function(error, result){
    res.render('password/Delete', {post: result[0], errors: errors});
  })
});

//delete
router.post('/:number/delete', function(req, res){
  var password = req.body.password;
  var errors = {};
  var isValid = true;

  if(!req.body.password){
    isValid = false;
    errors.password = 'Password is required!';
  }
  if(isValid){
    client.query('select password from post where number = ?', [req.params.number], function(err, data){
      if(err) return res.json(err);
      bcrypt.compare(password, data[0].password, function(err, result){
        if(result){
          client.query('delete from comment where Pid = ?', [req.params.number], function(err){
            if(err) return res.json(err);
          });
          client.query('delete from post where number = ?', [req.params.number], function(err){
            if(err) return res.json(err);
            res.redirect('/posts'+ res.locals.getPostQueryString(false, {page: 1}));
          });
        } else {
          req.flash('errors', {login: 'The password is incorrect.'});
          res.redirect('/password/' + req.params.number + '/delete' + res.locals.getPostQueryString());
        }
      });
    });
  } else {
    req.flash('errors', errors);
    res.redirect('/password/' + req.params.number + '/delete' + res.locals.getPostQueryString());
  }
});

module.exports = router;
