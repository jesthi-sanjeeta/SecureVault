var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var mysql = require('mysql');
var crypto = require('crypto');
var morgan = require('morgan');

//authentication packages
var session = require('express-session');
var session;
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var MySQLStore = require('express-mysql-session')(session);

app.use(morgan('combined'));
app.use(bodyParser.json());
var connection = mysql.createConnection({
//properties
host: 'localhost',
port: 3306,
user:'root',
password:'password',
//database:'sampledb'
database:'userschema'
});
connection.connect(function(error){
	if(error){
		console.log(error);

	}
	else{
		console.log('Connected');
	}
	});
app.get('/db',function(req,res){
	//about mysql
	connection.query("SELECT * FROM user",function(error,rows,fields){
		if(!!error){
			console.log("Error in the query");
		}
		else{
			console.log("Query successful");
			res.send(JSON.stringify(rows));
			//parse with rows/fields
		}

	});

});
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());
var options = {
//properties
host: 'localhost',
port: 3306,
user:'root',
password:'password',
database:'userschema'
};
var sessionStore = new MySQLStore(options);
app.use(session({
    secret: 'someRandomSecretValue',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    //cookie: { maxAge: 1000 * 60 * 60 * 24 * 30}
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  function(username, password, done) {
      
      var password = password;
   connection.query('SELECT * FROM `user` WHERE email = ?', [username], function (err, result){
    if (err) {
          done(err);
      } 
  else {
         
              // Match the password
              
              var dbString = result[0].password;
              
              var hashedPassword = hash(password); // Creating a hash based on the password submitted and the original salt
              if (hashedPassword === dbString) {      
                  return done(null, {user_id : result[0].idUser});
                } else {
                  done(null,false);
                  }

      }
   });

      
   }
    
    ));
 
//Home page
app.get('/', function(req,res){
	session = req.session;
	if(session.uniqueID){
		res.redirect('/redirects');
	}
	
	res.sendFile(__dirname +'/index.html');
	});
//creating hash
function hash (input) {
  var hash = crypto.createHash('sha256');
  hash_update = hash.update(input, 'utf-8');
  generated_hash = hash_update.digest('hex');

  return generated_hash;
    // How do we create a hash?
    //var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    //return ["pbkdf2", "10000", salt, hashed.toString('hex')].join('$');
}

//endpoint to check the hash
app.get('/hash/:input', function(req, res) {
   var hashedString = hash(req.params.input, 'this-is-some-random-string');
   res.send(hashedString);
});

app.post('/create_user', function (req, res) {

   console.log("inside server");
   var username = req.body.username;
   var password = req.body.password;
   var user_type = req.body.user_type;
   console.log(req.body.username);
   console.log(req.body.password);
   //var salt = crypto.randomBytes(128).toString('hex');
   var dbString = hash(password);
   //var salt = crypto.randomBytes(128).toString('hex');
   //var dbString = hash(password, salt);
   var sql = "INSERT INTO `user` (`email`,`password`,`usertype`) values ('"+username+"', '"+dbString+"','"+user_type+"');";
   
   	console.log(sql);
      connection.query(sql, function (err, result){
      if (err) {
          res.status(400).send(sql);
      } else {
        var sql1 = "SELECT LAST_INSERT_ID() as idUser ;";
          connection.query(sql1,function (err, result){
          if (err) {
            res.status(400).send(sql);
          }else{
            const user_id = result[0].idUser;
            console.log("result :" + result[0].idUser);
            req.login(user_id,function(err){
              res.redirect('/login');
            });
     
        }
      });
       
      }
   });
});

passport.serializeUser(function(user_id, done) {
  console.log("serialise :");
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
  console.log("De-serialise :");
    done(null, user_id);
  });

function authenticationMiddleware () {  
  return (req, res, next) => {
    console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);
console.log(`AUTHM:${JSON.stringify(req.session.passport)}`);
      if (req.isAuthenticated()) return next();
      res.redirect('/login')
  }
}

app.post('/login',passport.authenticate('local',{
  successRedirect:'/dashBoard',
  failureRedirect: '/login'
}));



app.get('/check-login', function (req, res) {
   if (req.session && req.session.auth && req.session.auth.userId) {
       // Load the user object
       pool.query('SELECT * FROM "user" WHERE id = $1', [req.session.auth.userId], function (err, result) {
           if (err) {
              res.status(500).send(err.toString());
           } else {
            sessionStorage.setItem("username", result.rows[0].username);
              res.send(result.rows[0].username);    
           }
       });
   } else {
       res.status(400).send('You are not logged in');
   }
});
app.get('/logout', function (req, res) {
  console.log("logout here");
   delete req.session.auth;
   req.session.destroy();
   res.send('<html><body><style> body{background-color: #44B3AF ;}</style>Logged out!<br/><br/><a href="/">Back to home</a></body></html>');
});
app.post('/logout', function (req, res) {
  console.log("logout");
  req.logout();
  req.session.destroy();
   //delete req.session.auth;
   res.send('<html><body><style> body{background-color:background-color: #44B3AF ;}</style>Logged out!<br/><br/><a href="/">Back to home</a></body></html>');
});

app.get('/login', function(req,res){
	//session = req.session;
	
	//res.sendFile('/login.html',{root: path.join(__dirname,'./files')});
	res.sendFile(__dirname +'/login.html');
});
app.get('/dashBoard',authenticationMiddleware (), function(req,res){
  
  res.sendFile(__dirname +'/dashBoard.html');
});
app.get('/style.css', function (req, res) {
  res.sendFile(__dirname+ '/style.css');
});

app.get('/login.js', function (req, res) {
  res.sendFile(__dirname+ '/login.js');
});
app.get('/dashBoard.js', function (req, res) {
  res.sendFile(__dirname+ '/dashBoard.js');
});
app.get('/logout.js', function (req, res) {
  console.log("logout.js");
  res.sendFile(__dirname+ '/logout.js');
});
app.get('/create_user.js', function (req, res) {
  console.log("server-create.js");
  res.sendFile(__dirname+ '/create_user.js');
});

app.get('/register', function(req,res){

	res.sendFile(__dirname +'/create_user.html');
	});



app.get('/img.png', function (req, res) {
  res.sendFile(__dirname+ '/img.png');
});
app.get('/img2.png', function (req, res) {
  res.sendFile(__dirname+ '/img2.png');
});
app.get('/home.png', function (req, res) {
  res.sendFile(__dirname+ '/home.png');
});

app.get('/freelancer.min.css', function (req, res) {
  res.sendFile(__dirname+ '/freelancer.min.css');
});
	app.listen(8000);