import {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLBoolean
} from 'graphql';

import { introspectionQuery } from 'graphql/utilities';
import fs from 'fs';
import GraphQLHTTP from 'express-graphql';
import queryHelper from './queryHelper';
import classDef from './classDef';

const makeGraphQLListArgs = t => {
  const out = {};
  Object.keys(t.props).forEach(key => {
    const prop = t.props[key];
    switch (prop.type) {
      case 'boolean':
        out[key] = { type: GraphQLBoolean };
        break;
      case 'number':
        out[key] = { type: GraphQLInt };
        break;
      default :
        out[key] = { type: GraphQLString };
    }
  });
  Object.keys(t.reltypes).forEach(key => {
    out[key] = { type: GraphQLString };
  });
  return out;
};

const makeGraphQLprops = props => {
  const out = {};
  Object.keys(props).forEach(key => {
    const prop = props[key];
    switch (prop.type) {
      case 'boolean':
        out[key] = { type: GraphQLBoolean };
        break;
      case 'number':
        out[key] = { type: GraphQLInt };
        break;
      case 'array<string>':
        out[key] = { type: new GraphQLList(GraphQLString) };
        break;
      default :
        out[key] = { type: GraphQLString };
    }
  });
  return out;
};

const generateFields = () => classDef.load().then(classDefs => {
  const fields = {};
  Object.keys(classDefs).forEach(key => {
    const t = classDefs[key];
    t.graphQLObjectType = new GraphQLObjectType(
      {
        name: t.lookup,
        description: t.description,
        fields: () => {
          const p = makeGraphQLprops(t.props);
          Object.keys(t.reltypes).forEach(reltypekey => {
            const reltype = t.reltypes[reltypekey];
            const objtype = classDefs[reltype.class].graphQLObjectType;
            p[reltypekey] = {
              type: new GraphQLList(objtype)
            };
            const args = makeGraphQLListArgs(classDefs[reltype.class]);
            p[reltypekey].args = args;
          });
          return p;
        }
      });

    fields[t.lookup] = {
      type: new GraphQLList(t.graphQLObjectType),
      args: makeGraphQLListArgs(t),
      resolve: (source, args, root) => {
        const selections = root.fieldASTs[0].selectionSet.selections;
        const qh = queryHelper(classDefs);
        const query = qh.resolve(t, args, selections, root.fragments);
        return qh.execute(query);
      }
    };
  });
  return fields;
});


const api = {
  load: app => {
    generateFields().then(fields => {
      const storeType = new GraphQLObjectType({
        name: 'Store',
        fields: () => fields
      });
      const store = {};
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: () => ({
            store: {
              type: storeType,
              resolve: () => store
            }
          })
        })
      });

      app.use('/graphql', new GraphQLHTTP({
        schema,
        graphiql: true
      }));

      graphql(schema, introspectionQuery).then(json => {
        fs.writeFile('../data/schema.json', JSON.stringify(json, null, 2));
      });
    });
  }
};

export default api;
