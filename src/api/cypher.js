import config from '../api.config';
import r from 'request-promise';
import NeoError from './NeoError';

const txUrl = config.neo4j.root + '/db/data/transaction/commit';

const cypher = (statements, transform) => {
  return r.post({
    uri: txUrl,
    method: 'POST',
    json: { statements: statements },
    headers: {
      'Authorization': config.neo4j.password
    },
    transform:transform
  });
};

const isEmpty = (obj) => {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop))
      return false;
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
  executeStatements: (statements) => {
      // Check api each statement is a statement and not just a query
    statements = statements.map(s => {
      if (!s.statement) { s = api.buildStatement(s); }
      return s;
    });

    return cypher(statements).then(d => {
      if (d.errors.length) {
        throw (new NeoError(d.errors[0], statements));
      } else {
        return d.results;
      }
    });
  }
    ,
    // Type = graph or row
  executeQuery: (q, type, params) => {

    const statements = [api.buildStatement(q, type, params)];

    return cypher(statements).then(d => {
      if (d.errors.length) {
        throw (new NeoError(d.errors[0], statements));
      } else if (d.results.length) {
        return d.results[0].data;
      } else {
        return null;
      }
    });
  }
};

export default api;
