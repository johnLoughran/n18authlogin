//require("dotenv").config(); // configure envmt variables .env file in this dir
// see git branch usingBcrypt for old code including mongoose-encryption, md5, bcrypt
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");

const session = require("express-session");            // PASSPORT not sessions!
const passport = require("passport");     // autheniticate()                          // PASSPORT
const passportLocalMongoose = require("passport-local-mongoose");   // PASSPORT
// register(), login(), logout()

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: "OurLittleSecret!Temporary",
  resave: false,
  saveUninitialized: false
}));                                                                  // PASSPORT
app.use(passport.initialize());                                      // PASSPORT
app.use(passport.session());                                        // PASSPORT

const dbName = "userDB";
mongoose.connect("mongodb://localhost:27017/" + dbName, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true); // to avoid deprecation warnings

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);                           // PASSPORT

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());   // adds cookie, encrypts
passport.deserializeUser(User.deserializeUser());                   // PASSPORT

///////////////////// Home Route /////////////////////////////////

app.get("/", function(req, res){
  res.render("home.ejs");
});

///////////////////// Members Route /////////////////////////////////

app.get("/members", function(req, res){
  if (req.isAuthenticated()){
    res.render("members.ejs");
  } else {
    res.redirect("/login");
  }
});

///////////////////// Register Route /////////////////////////////////

app.route("/register")

.get(function(req, res){
  res.render("register.ejs");
})

.post(function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.send(err.message);
      // res.redirect("/register");
    } else {
      // check if user not already in DB amd if all ok proceed, store a cookie, hash
      passport.authenticate("local")(req, res, function(error){
        if(error){
          res.send(error);
        } else {
          res.redirect("/members");  // let them in if they have registered
        }
      })
    }
  })
});

///////////////////// Login Route /////////////////////////////////

app.route("/login")

.get(function(req, res){
  res.render("login.ejs");
})

.post(function(req, res){
  const aUser = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(aUser, function(err){
    if(err){
      console.log(err);
      //return next(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/members");
      })
      // return res.redirect("/members" + req.user.username);
    }
  })
});

///////////////////// Logout Route /////////////////////////////////

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

///////////////////// Listen /////////////////////////////////

app.listen(process.env.PORT || 3000, function(req, res){
  console.log("Server started.");
});
