'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _schema = require('./api/graphql/schema.fromdb');

var _schema2 = _interopRequireDefault(_schema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let app = (0, _express2.default)();

var config = require('./config');
// Add headers
app.use(require('./headers'));

var port = process.env.PORT || config.host.port;

_schema2.default.load(app);

app.listen(port);
console.log('Listening on port ' + port);
//# sourceMappingURL=app.graphql.js.map