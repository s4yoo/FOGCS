var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var request = require('request');
var methodOverride = require('method-override');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('./config/passport');
var util = require('./util');
var fetch = require("node-fetch");
var rateLimit = require("express-rate-limit");
var path = require("path");

var app = express();

//Express rate limit settings
var limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});

// DB setting
var client = mysql.createConnection({
  user: 'root',
  password: '1234',
  database: 'homework'
});

// Other settings
app.set('view engine', 'ejs');
app.use(express.static(__dirname+'/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(methodOverride('_method'));
app.use(flash());
app.use(session({secret:'MySecret', resave:true, saveUninitialized:true}));
app.use(limiter);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Custom Middlewares
app.use(function(req, res,next){
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentUser = req.user;
  res.locals.util = util;
  next();
});

// Routes
app.use('/', util.getPostQueryString, require('./routes/home'));
app.use('/posts', util.getPostQueryString, require('./routes/posts'));
app.use('/password', util.getPostQueryString, require('./routes/password'));
app.use('/video', require('./routes/video'));
app.use('/image', require('./routes/image'));
app.use('/comments', util.getPostQueryString, require('./routes/comments'));

// Port setting
var port = 52273;
app.listen(port, function(){
  console.log('server on! http://localhost:'+port);
});
