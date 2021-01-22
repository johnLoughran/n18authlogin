//require("dotenv").config(); // configure envmt variables .env file in this dir
// see git branch usingBcrypt for old code including mongoose-encryption, md5, bcrypt
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

const dbName = "userDB";
mongoose.connect("mongodb://localhost:27017/" + dbName, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const User = new mongoose.model("User", userSchema);

///////////////////// Home Route /////////////////////////////////

app.get("/", function(req, res){
  res.render("home.ejs");
});

///////////////////// Login Route /////////////////////////////////

app.route("/login")

.get(function(req, res){
  res.render("login.ejs");
})

.post(function(req, res){
  User.findOne ( {email: req.body.username}, function(err, foundUser){
    if (err) {
      res.send(err);
    } else {
      if (foundUser) {
        bcrypt.compare(req.body.password, foundUser.password, function(err, result){
          if (result === true){
            res.render("members.ejs");
          } else {
            res.send("Sorry. Unable to connect to an account with that email and password(WP).");
          }
        })
      } else {
        res.send("Sorry. Unable to connect to an account with that email and password(WU).");
      } // end if found User
    } // end if err
  });
});

///////////////////// Register Route /////////////////////////////////

app.route("/register")

.get(function(req, res){
  res.render("register.ejs");
})

.post(function(req, res){
  bcrypt.hash(req.body.password, saltRounds, function(errorNotHandled, hash){
    let newUser = new User({
      email: req.body.username,
      password: hash
    })
    User.findOne ( {email: req.body.username}, function(err, uName){
      if (err) {
        res.send(err);
      } else if (uName) {
        res.send("You have already registered. Please login.")
      } else {
        newUser.save(function(error){
          if(!error){
            // res.send("You have registered. You may now login.")
            // res.redirect("/login");
            // console.log("User registered with u: ", newUser.email, " and p: ", newUser.password);
            res.render("members.ejs"); // no route for this page so can only reach it by registering
          } else {
            res.send(error);
          }
        });
      }
    }); // end find and save user acc
  })

});

///////////////////// Listen /////////////////////////////////

app.listen(process.env.PORT || 3000, function(req, res){
  console.log("Server started.");
});
