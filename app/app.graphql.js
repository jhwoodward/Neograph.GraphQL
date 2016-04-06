require('source-map-support').install();
import express from 'express';
import schema from './api/graphql/schema.fromdb';


let app = express();

var config = require('./config');
// Add headers
app.use(require('./headers'));

var port = process.env.PORT || config.host.port;      

schema.load(app);

app.listen(port);
console.log('Listening on port ' + port);