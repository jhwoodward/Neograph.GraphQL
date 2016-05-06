'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _changeCase = require('change-case');

var _changeCase2 = _interopRequireDefault(_changeCase);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const api = {
  camelCase: props => {
    const out = {};
    Object.keys(props).forEach(key => {
      out[_changeCase2.default.camelCase(key)] = props[key];
    });
    return out;
  },
  pascalCase: obj => {
    if (_lodash2.default.isArray(obj)) {
      // Array - pascal case array values
      for (let i = 0; i < obj.length; i++) {
        obj[i] = _changeCase2.default.pascalCase(obj[i]);
      }
      return obj;
    }
    // Object - pascal case property keys
    const out = {};
    Object.keys(obj).forEach(key => {
      out[_changeCase2.default.pascalCase(key)] = obj[key];
    });
    return out;
  }
};

exports.default = api;
//# sourceMappingURL=utils.js.map