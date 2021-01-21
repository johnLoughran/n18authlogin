require("dotenv").config(); // configure envmt variables .env file in this dir
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

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

//ENCRYPTION - During save, documents are encrypted and then signed. During find, documents
//are authenticated and then decrypted, https://www.npmjs.com/package/mongoose-encryption
//For convenience, you can also pass in a single secret string instead of two keys
// I wrote a Hai-ku, It was not a great hai-ku, but it was O K!
const secretString = process.env.SECRET_STRING; // so it cannot be seen on gitHub
// encrypt pwd regardless of any other options. name and _id will be left unencrypted
//userSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey, encryptedFields: ['password'] });
userSchema.plugin(encrypt, { secret: process.env.SECRET_STRING, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);
const user0 = new User({
  email: "John",
  password: "pwd"
})
//user0.save();

app.get("/", function(req, res){
  res.render("home.ejs");
});

app.route("/login")

.get(function(req, res){
  res.render("login.ejs");
})

.post(function(req, res){
  console.log(req.body.username, req.body.password, '\n', req.body);
  User.findOne ( {email: req.body.username}, function(err, foundUser){
    console.log(foundUser);
    if (err) {
      res.send(err);
    } else {
      if (foundUser) {
        console.log("The decrypted pwd is: " + foundUser.password);
        if (foundUser.password === req.body.password) {
          res.render("members.ejs");
        } else {
          res.send("Sorry an account with that email and password does not exist(WP).");
        }
      } else {
        res.send("Sorry an account with that email and password does not exist(WU).");
      }
    }
    // if (req.body.username === userAcc.email && req.body.password === userAcc.password){
    //   res.render("members.ejs"); // no route for this page so can only reach it by registering/logging in
    // } else if (!userAcc) {
    //   console.log("No user acc");
    //   res.send("That account does not exist. Please try again.");
    // } else if (req.body.username === userAcc.email && req.body.password !== userAcc.password) {
    //   res.send("Wrong password.");
    // } else if (err) {
    //   res.send(err);
    // } else {
    //   "Something went wrong."
    // }
  })
});

app.route("/register")

.get(function(req, res){
  res.render("register.ejs");
})

.post(function(req, res){
  console.log(req.body.username + req.body.password);
  // if this user record is not in the DB then create it
  let newUser = new User({
    email: req.body.username,
    password: req.body.password
  })
  User.findOne ( {email: req.body.username}, function(err, uName){
    if (err) {
      res.send(err);
    } else if (uName) {
      res.send("You have already registered. Please login.")
      // res.redirect("/login"); // make app crash, after send cannot redirect
    } else {
      newUser.save(function(error){
        if(!error){
          // res.send("You have registered. You may now login.")
          // res.redirect("/login");
          res.render("members.ejs"); // no route for this page so can only reach it by registering
        } else {
          res.send(error);
        }
      });
    }
  })
});


app.listen(process.env.PORT || 3000, function(req, res){
  console.log("Server started.");
});