import sourceMapSupport from  'source-map-support';
import express from 'express';
import schema from './api/schema';
import config from './server.config';
import headers from './headers';

sourceMapSupport.install();
const port = process.env.PORT || config.host.port;   
const app = express();
app.use(headers);
schema.load(app);
app.listen(port);
console.log(`Graphql ready at port ${port}/graphql`);