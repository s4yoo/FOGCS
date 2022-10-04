var express = require('express');
var router = express.Router();
var util = require('../util');
var mysql = require('mysql');
var bcrypt = require('bcryptjs');

var salt = 10;

var client = mysql.createConnection({
  user: 'root',
  password: '1234',
  database: 'homework'
});

router.post('/', checkPostId, function(req, res){
  var post = res.locals.post;
  var isValid = true;
  var errors = {};

  req.body.post = post.number;

  if(!req.body.author){
    isValid = false;
    req.flash('commentForm',{_id: req.query.postId, form: req.body });
    errors.author = 'Author is Required!';
    req.flash('errors', errors);
    req.flash('commentError', {_id: req.query.postId, parentComment: req.body.parentComment, author: 'Author is Required!'});
  }
  if(!req.body.password){
    isValid = false;
    req.flash('commentForm',{_id: req.query.postId, form: req.body });
    errors.password = 'Password is Required!';
    req.flash('errors', errors);
    req.flash('commentError', {_id: req.query.postId, parentComment: req.body.parentComment, password: 'Password is Required!'});
  }
  if(!req.body.text){
    isValid = false;
    req.flash('commentForm',{_id: req.query.postId, form: req.body });
    errors.text = 'Text is Required!';
    req.flash('errors', errors);
    req.flash('commentError', {_id: req.query.postId, parentComment: req.body.parentComment, text: 'Text is Required!'});
  }
  if(isValid){
    if(!req.body.parentComment){
      bcrypt.hash(req.body.password, salt, function(err, hash){
        client.query('insert into comment (Pid, author, text, password) values (?, ?, ?, ?)', [req.query.postId, req.body.author, req.body.text, hash], function(err){
          if(err){
            console.log(err);
          }
          client.query('UPDATE post SET commentCount = commentCount + 1 WHERE number = ?',[req.query.postId]);
          return res.redirect('/posts/'+ post.number + res.locals.getPostQueryString());
        });
      });
    } else {
      bcrypt.hash(req.body.password, salt, function(err, hash){
        client.query('insert into comment (Pid, author, text, password, parentComment) values (?, ?, ?, ?, ?)', [req.query.postId, req.body.author, req.body.text, hash, req.body.parentComment], function(err){
          if(err){
            console.log(err);
          }
          return res.redirect('/posts/'+ post.number + res.locals.getPostQueryString());
        });
      });
    }
  } else {
    req.flash('commentForm', {_id: req.query.postId, form: req.body });
    req.flash('commentError', {_id: req.query.postId, parentComment: req.body.parentComment});
    req.flash('errors', errors);
    res.redirect('/posts/'+ post.number + res.locals.getPostQueryString());
  }
});

//upadte
router.put('/:id', checkPostId, function(req, res){
  var post= res.locals.post;
  var errors = {};
  var isValid = true;

  if(!req.body.editAuthor){
    isValid = false;
    req.flash('commentError',{_id: req.params.id, parentComment:req.body.parentComment, editAutor: 'Author is Required!'});
    req.flash('commentForm', {_id: req.params.id, form: req.body});
    req.flash('errros', {editAuthor: 'Author is Required!'});
  }
  if(!req.body.editPassword){
    isValid = false;
    req.flash('commentError', {_id: req.params.id, parentComment:req.body.parentComment, editPassword: 'Password is Required!'});
    req.flash('commentForm', {_id: req.params.id, form: req.body});
    req.flash('errros', {editPassword: 'password is Required!'});
  }
  if(!req.body.editText){
    isValid = false;
    req.flash('commentError', {_id: req.params.id, parentComment:req.body.parentComment, editText: 'Text is Required!'});
    req.flash('commentForm', {_id: req.params.id, form: req.body});
    req.flash('errros', {editText: 'text is Required!'});
  }
  if(isValid){
    client.query('select password from comment where id = ?', [req.params.id], function(err, pw){
      bcrypt.compare(req.body.editPassword, pw[0].password, function(err, result){
        if(result){
          client.query('update comment set author = ?, updateAt = now(), text = ? where id = ?',
            [req.body.editAuthor, req.body.editText, req.params.id], function(err){
              if(err){
                console.log(err);
              }
              return res.redirect('/posts/' + post.number + res.locals.getPostQueryString());
          });
        } else {
          req.flash('commentFrom',{_id: req.params.id, parentComment:req.body.parentComment, form: req.body});
          req.flash('errors', {login: 'The password is incorrect.'});
          res.send('<script type="text/javascript">alert("The password is incorrect"); window.history.back()</script>');
          //res.redirect('/posts/' + post.number + res.locals.getPostQueryString());
        }
      });
    });
  } else {
    req.flash('commentFrom',{_id: req.params.id, form: req.body});
    req.flash('errors', errors);
    res.redirect('/posts/' + post.number + res.locals.getPostQueryString());
  }
});

//delete
router.delete('/:id', checkPostId, function(req, res){
  var post = res.locals.post;
  var errors = {};
  var isValid = true;

  if(!req.body.deletePassword){
    isValid = false;
    req.flash('error', {deletePassword: 'Password is Required!'});
    req.flash('commentForm', {_id: req.params.id, form: req.body});
  }
  if(isValid){
    client.query('select password from comment where id = ?',[req.params.id], function(err,pw){
      bcrypt.compare(req.body.deletePassword, pw[0].password, function(err, result){
        if(result){
          client.query('update comment set isDeleted = 1 where id = ?', [req.params.id], function(err){
            if(err) return res.json(err);
            return res.redirect('/posts/' + post.number + res.locals.getPostQueryString());
          });
        } else {
          req.flash('errors', {password: 'The password is incorrect.'});
          res.send('<script type="text/javascript">alert("The password is incorrect"); window.history.back()</script>');
        }
      });
    });
  } else {
    req.flash('errors', errors);
    //res.redirect('/posts/' + post.number + res.locals.getPostQueryString());
    res.send('<script type="text/javascript">alert("Password is Required!"); window.history.back()</script>');
  }
});

module.exports = router;

function checkPostId(req, res, next){
  client.query('select * from post where number = ?', [req.query.postId], function(err, post){
    if(err) return res.json(err);

    res.locals.post = post[0];
    next();
  });
}
