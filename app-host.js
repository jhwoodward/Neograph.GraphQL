
var express = require('express');        // call express
var app = express();                 // define our app using express
var bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var config = require('./config');

// Add headers
app.use(require('./headers'));

var port = process.env.PORT || config.host.port;       

//configure routes
app.use(config.host.root, require('./api/app')(require('./api-config')));

app.listen(port);
console.log('Magic happens on port ' + port);