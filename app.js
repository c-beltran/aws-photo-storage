// load all env variables from .env file into process.env object.
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
var app = express();

// set templating language which allows us to use JS in html
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

// testing if DB works
// client.query('SELECT $1::text as message', ['Connection to DB Works!'], (err, res) => {
//   console.log(err ? err.stack : res.rows[0].message) // Hello World!
//   client.end()
// });

// Creating DB table ***MOVE TO A SEED FILE***
const createTableNote = `CREATE TABLE note (
  id serial PRIMARY KEY NOT NULL,
  title varchar(100),
  description text,
  photo_s3_url text,
  created_at timestamp without time zone,
  deleted_at timestamp without time zone,
  updated_at timestamp without time zone
  );`;

// client.query(createTableNote, (err, res) => {
//   if (err) {
//     console.log(err.stack)
//   } else {
//     console.log(res.rows[0])
//   }
// })

// Insert into table
const insertQuery = `INSERT INTO note (
  title,
  description,
  created_at)
  VALUES($1, $2, $3) RETURNING id;`;
const insertValues = ["Testing #2", "YERRR another description!", "NOW()"];

// client.query(insertQuery, insertValues, (err, res) => {
//   if (err) {
//     console.log(err.stack)
//   } else {
//     console.log(res.rows[0])
//   }
// })

//requiring ROUTES
var httpRoutes = require("./routes/routes.js");
app.use("/", httpRoutes);

//localhost
app.listen(process.env.PORT || 8000, function() {
	console.log("STARTED APP ON PORT 8000");
});