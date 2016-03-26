
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

var apiconfig = require('./api.config');

/*apiconfig should look like this:
{  
    neo4j:
        {
            root: "http://localhost:7474",
            password: 'password'
        }
        ,
        media:{
            root:'http://path/to/media/'
        } 
    
}
*/

//CAN I USE PROCESS.ENV. FOR CONFIG ??

//configure routes
app.use(config.host.root, require('./api/routes')(apiconfig));



app.listen(port);
console.log('Listening on port ' + port);