'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _server = require('./server.config');

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (req, res, next) => {
  // Cors allow
  if (req.headers.origin) {
    for (let i = 0; i < _server2.default.origins.length; i++) {
      const origin = _server2.default.origins[i];
      if (req.headers.origin.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        break;
      }
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
};
//# sourceMappingURL=headers.js.map