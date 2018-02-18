"use strict";

require("./config/config");

const express = require("express");
const bodyParser = require("body-parser");
const { ObjectID } = require("mongodb");
const _ = require("lodash");
const path = require("path");
const logger = require("morgan");
const pug = require("pug");
const cookieParser = require("cookie-parser");
const session = require("express-session");

var { mongoose } = require("./db/mongoose");
var { Resource } = require("./models/resources");
var { User } = require("./models/users");
var { authenticate } = require("./middlewares/authenticate");
// var {router} = require('./server/router.js');

var app = express();
const port = process.env.PORT || 3000;

app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use(cookieParser());
app.use(
  session({
    secret: "TJBJHDH984H=hfvnv873yhfh",
    resave: true,
    saveUninitialized: true
  })
);

app.get("/", (req, res) => {
  User.find({}, function(err, users) {
    if (err) {
      console.log(err);
    } else {
      res.render("index", {
        title: "Articles",
        users,
        Resource
      });
    }
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/resources", authenticate, (req, res) => {
  var resource = new Resource({
    title: req.body.title,
    body: req.body.body,
    _creator: req.user._id
  });
  resource.save().then(
    doc => {
      res.send(doc);
    },
    e => {
      res.status(400).send();
    }
  );
});

app.get("/resources", (req, res) => {
  Resource.find().then(
    resources => {
      res.status(200).send({ resources });
    },
    e => {
      res.status(400).send(e);
    }
  );
});

app.get("/resources/:id", authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Resource.findOne({
    _id: id,
    _creator: req.user._id
  })
    .then(resource => {
      if (!resource) {
        return res.status(404).send();
      }

      res.send({ resource });
    })
    .catch(e => {
      res.status(400).send();
    });
});

app.delete("/resources/:id", authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }
  Resource.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  })
    .then(resource => {
      if (!resource) {
        return res.status(400).send();
      }

      res.status(200).send({ resource });
    })
    .catch(e => {
      res.status(400).send();
    });
});

app.patch("/resources/:id", authenticate, (req, res) => {
  var id = req.params.id;
  var body = _.pick(req.body, ["title", "body"]);

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  Resource.findOneAndUpdate(
    {
      _id: id,
      _creator: req.user._id
    },
    { $set: body },
    { new: true }
  )
    .then(resource => {
      if (!resource) {
        return res.status(404).send();
      }
      res.status(200).send({ resource });
    })
    .catch(e => {
      res.status(400).send();
    });
});

app.post("/users", (req, res) => {
  var body = _.pick(req.body, ["email", "password"]);
  var user = new User(body);

  user
    .save()
    .then(() => {
      return user.generateAuthToken();
    })
    .then(token => {
      res.header("x-auth", token).send(user);
    })
    .catch(e => {
      res.status(400).send();
    });
});

app.get("/users/me", authenticate, (req, res) => {
  res.send(req.user);
});

app.post("/users/login", (req, res) => {
  var body = _.pick(req.body, ["email", "password"]);

  User.findByCredentials(body.email, body.password)
    .then(user => {
      return user.generateAuthToken().then(token => {
        res.header("x-auth", token).send(user);
      });
    })
    .catch(e => {
      res.status(400).send();
    });
});

app.delete("users/me/token", authenticate, (req, res) => {
  req.user.removeToken(req.token).then(
    () => {
      res.status(200).send();
    },
    () => {
      res.status(400).send();
    }
  );
});

app.get("/logout", (req, res) => {
  res.redirect("/users/login");
});

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});

module.exports = { app };
