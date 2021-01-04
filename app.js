// load all env variables from .env file into process.env object.
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
var app = express();

// set templating language which allows us to use JS in html
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

//requiring ROUTES
const httpRoutes = require("./routes/routes.js");
app.use("/", httpRoutes);

//localhost
app.listen(process.env.PORT || 8000, function() {
	console.log("STARTED APP ON PORT 8000");
});