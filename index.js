const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const routes = require('./routes');
const app = express();
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
require("dotenv").config();

const cors = require("cors");

// MONGO DB Config
const db = `${process.env.MONGO_DB}`;

// Connect to MongoDB
mongoose
  .connect(
    db,
    { useNewUrlParser: true ,useUnifiedTopology: true, useFindAndModify: false}
  )
  .then(() => console.log('MongoDB Connected - Patient'))
  .catch(err => console.log(err));


app.use(expressLayouts);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(session({
    name: 'session',
    secret: 'hakunaMaTata',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 3600 * 1000, // 1hr
    }
}));

// Connect flash
app.use(flash());

//body parser
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error_ = req.flash('error_');
  next();
});

app.use('/public', express.static('public'))
app.use(routes);



//app.use( (req, res, next)=>{ res.render('404') })

app.listen(5000, () => console.log('Server is running on port 5000'));