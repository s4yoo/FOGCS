var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var client = mysql.createConnection({
  user: 'root',
  password: '1234',
  database: 'homework'
});

// serialize & deserialize User
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  client.query('select username, id from admin where id = ?', [id], function(err, user){
    done(err, user);
  });
});

// local strategy
passport.use('local-login',
  new LocalStrategy({
      usernameField : 'username',
      passwordField : 'password',
      passReqToCallback : true
    },
    function(req, username, password, done) {
      client.query('select * from admin where username = ?', [username], function(err, user) {
        if (err) return done(err);
        if (user[0] && password == user[0].password) {
          //bcrypt.compare(password, user[0].password, function(err, result){
            return done(null, user[0]);
          //});
        } else {
          req.flash('username', username);
          req.flash('errors', {login:'The username or password is incorrect.'});
          return done(null, false);
        }
      });
    }
  )
);

module.exports = passport;
