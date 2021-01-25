//require("dotenv").config(); // configure envmt variables .env file in this dir
// see git branch usingBcrypt for old code including mongoose-encryption, md5, bcrypt
// Minor issue: Users who login via G or FB remain logged into G/FB after logging out of this app
require("dotenv").config();  // so app can find env vars in .env file
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");

const session = require("express-session");            // PASSPORT not sessions!
const passport = require("passport");     // autheniticate()                          // PASSPORT
const passportLocalMongoose = require("passport-local-mongoose");   // PASSPORT
// register(), login(), logout()
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;  // FACEBOOK

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

//var firstName = "";
//var lastName = "";

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  googleFirstName: String,
  googleLastName: String,
  facebookId: String
});                                                             // GOOGLE, FACEBOOK

userSchema.plugin(passportLocalMongoose);                           // PASSPORT
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
//passport.serializeUser(User.serializeUser());   // adds cookie, encrypts
//passport.deserializeUser(User.deserializeUser());                   // PASSPORT

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/n18authlogin",
    //userProfileURL: "https://www.googpleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb){
    console.log("After logging in via Google, then local authentication, user profile: ", profile);
    console.log("Welcome ", profile.name.givenName);
    //firstName = profile.name.givenName; // would apply to all users generally
    //lastName = profile.name.familyName;
    User.findOrCreate({ googleId: profile.id, googleFirstName: profile.givenName, googleLastName: profile.familyName }, function (err, user){
      return cb(err, user);
    });
  }
));

// can add option to fbStrat  profileFields: ['id', 'displayName', 'photos', 'email'],
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/n18authlogin"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));                                                               // FACEBOOK

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

///////////////////// Submit Route /////////////////////////////////

// app.get("/submit", function(req, res){
//   if(req.isAuthenticated(){
//     res.render("submit.ejs");
//   } else {
//     res.redirect("/login");
//   }
// )
// });


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

///////////////////// Register / Login via Google Route /////////////////////////////////

app.get("/auth/google",
  // brings up a popup to allow user to login via Google
  passport.authenticate("google", { scope: ["profile"] })
);

// Google redirects to this route, stored in my project on https://console.cloud.google.com/
app.get("/auth/google/n18authlogin",
  passport.authenticate("google", {
      failureRedirect: "/login",
      failureFlash: "Authentication via Google failing."
  }),
  function(req, res){
    console.log("Authenticating user via Google");
    res.redirect("/members");
  }
);

///////////////////// Register / Login via Facebook Route /////////////////////////////////
                                                                        // FACEBOOK
app.get("/auth/facebook",
  passport.authenticate("facebook")
);
//passport.authenticate("google", {scope: ["profile"]})

app.get("/auth/facebook/n18authlogin",
  passport.authenticate("facebook", {
    failureRedirect: "/login",
    failureFlash: "Authentication via Facebook failing."
  }),
  function(req, res){
    console.log("Authenticating user via Facebook");
    res.redirect("/members");
  }
);

///////////////////// Logout Route /////////////////////////////////

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

///////////////////// Listen /////////////////////////////////

app.listen(process.env.PORT || 3000, function(req, res){
  console.log("Server started.");
});
