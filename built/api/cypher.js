'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _api = require('../api.config');

var _api2 = _interopRequireDefault(_api);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _NeoError = require('./NeoError');

var _NeoError2 = _interopRequireDefault(_NeoError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const txUrl = _api2.default.neo4j.root + '/db/data/transaction/commit';

const cypher = (statements, transform) => {
  return _requestPromise2.default.post({
    uri: txUrl,
    method: 'POST',
    json: { statements: statements },
    headers: {
      'Authorization': _api2.default.neo4j.password
    },
    transform: transform
  });
};

const isEmpty = obj => {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) return false;
  }
  return true;
};

const api = {
  buildStatement: (q, type, params, includeStats) => {
    var out = { 'statement': q, 'includeStats': includeStats ? true : false };
    if (params && !isEmpty(params)) {
      out.parameters = params;
    }
    if (type) {
      out.resultDataContents = [type];
    }
    return out;
  },
  executeStatements: statements => {
    // Check api each statement is a statement and not just a query
    statements = statements.map(s => {
      if (!s.statement) {
        s = api.buildStatement(s);
      }
      return s;
    });

    return cypher(statements).then(d => {
      if (d.errors.length) {
        throw new _NeoError2.default(d.errors[0], statements);
      } else {
        return d.results;
      }
    });
  },

  // Type = graph or row
  executeQuery: (q, type, params) => {

    const statements = [api.buildStatement(q, type, params)];

    return cypher(statements).then(d => {
      if (d.errors.length) {
        throw new _NeoError2.default(d.errors[0], statements);
      } else if (d.results.length) {
        return d.results[0].data;
      } else {
        return null;
      }
    });
  }
};

exports.default = api;
//# sourceMappingURL=cypher.js.map