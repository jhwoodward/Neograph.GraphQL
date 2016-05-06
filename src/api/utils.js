import changeCase from 'change-case';
import _ from 'lodash';

const api = {
  camelCase: props => {
    const out = {};
    Object.keys(props).forEach((key) => {
      out[changeCase.camelCase(key)] = props[key];
    });
    return out;
  },
  pascalCase: obj => {
    if (_.isArray(obj)) {
        // Array - pascal case array values
      for (let i = 0; i < obj.length; i++) {
        obj[i] = changeCase.pascalCase(obj[i]);
      }
      return obj;
    }
    // Object - pascal case property keys
    const out = {};
    Object.keys(obj).forEach((key) => {
      out[changeCase.pascalCase(key)] = obj[key];
    });
    return out;
  }
};

export default api;
