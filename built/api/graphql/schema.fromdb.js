'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

var _utilities = require('graphql/utilities');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _expressGraphql = require('express-graphql');

var _expressGraphql2 = _interopRequireDefault(_expressGraphql);

var _types = require('./types.js');

var _types2 = _interopRequireDefault(_types);

var _queryHelper = require('./queryHelper');

var _queryHelper2 = _interopRequireDefault(_queryHelper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var config = require('../../api.config.js');

// import classDefs from './classDefs';
var picture = require('../picture')(config);
//var node = require('../node')(config);
var classDef = require('../class')(config);
let lodash = require("lodash");

let makeGraphQLListArgs = t => {

    let out = {};

    for (let pkey in t.props) {
        let p = t.props[pkey];
        switch (p.type) {
            case "boolean":
                out[pkey] = { type: GraphQLBoolean };
                break;
            case "number":
                out[pkey] = { type: _graphql.GraphQLInt };
                break;
            //   case "array[string]":
            //       out[pkey] ={type:new GraphQLList(GraphQLString)};
            //       break;
            default:
                out[pkey] = { type: _graphql.GraphQLString };
        }
    }

    for (let reltypekey in t.reltypes) {
        out[reltypekey] = { type: _graphql.GraphQLString };
    }

    return out;
};

let makeGraphQLprops = props => {

    let out = {};
    for (let pkey in props) {
        let p = props[pkey];
        switch (p.type) {
            case "boolean":
                out[pkey] = { type: GraphQLBoolean };
                break;
            case "number":
                out[pkey] = { type: _graphql.GraphQLInt };
                break;
            case "array<string>":
                out[pkey] = { type: new _graphql.GraphQLList(_graphql.GraphQLString) };
                break;
            default:
                out[pkey] = { type: _graphql.GraphQLString };
        }
    }

    return out;
};

let generateFields = () => {

    return classDef.refreshList().then(classDefs => {

        let fields = {};

        lodash.forOwn(classDefs, t => {

            t.graphQLObjectType = new _graphql.GraphQLObjectType({
                name: t.lookup,
                description: t.description,
                fields: () => {
                    let p = makeGraphQLprops(t.props);

                    for (let reltypekey in t.reltypes) {
                        let reltype = t.reltypes[reltypekey];
                        let objtype = classDefs[reltype.class].graphQLObjectType;
                        p[reltypekey] = {
                            type: new _graphql.GraphQLList(objtype)
                        };
                        let args = makeGraphQLListArgs(classDefs[reltype.class]);

                        p[reltypekey].args = args;
                    }

                    return p;
                }
            });

            /*
            
                        fields[t.lookup]={
                            type: single,
                             args:{
                                 lookup:{type:GraphQLString},
                                 id:{type:GraphQLInt}
                            } ,
                             resolve:function(source,args,root){
                                 
                                 let selections = root.fieldASTs[0].selectionSet.selections;
                                 return node.list.search(t,args,selections,classDefs).then(data=>{return data[0];});
                             } 
                        };
                  */

            fields[t.lookup] = { //t.plural ? -- from db
                type: new _graphql.GraphQLList(t.graphQLObjectType),
                args: makeGraphQLListArgs(t),
                resolve: (source, args, root) => {
                    let selections = root.fieldASTs[0].selectionSet.selections;

                    let qh = (0, _queryHelper2.default)(classDefs);
                    let query = qh.resolve(t, args, selections, root.fragments);
                    return qh.execute(query);

                    //   ;//.catch((err)=>{throw err})
                    // return data;
                }
            };
        });

        /*
        fields["GraphQuery"]=new GraphQLObjectType({
            name:"GraphQuery",
            fields:()=> ({
        node:{type:types.graph},
        provenance:{type:types.graph},
        period:{type:types.graph}
        })
        });
        */
        return fields;
    });
};

var out = {

    load: app => {

        generateFields().then(_fields => {

            let storeType = new _graphql.GraphQLObjectType({
                name: 'Store',
                fields: () => _fields
            });

            let store = {};

            let schema = new _graphql.GraphQLSchema({
                query: new _graphql.GraphQLObjectType({
                    name: 'Query',
                    fields: () => ({
                        store: {
                            type: storeType,
                            resolve: () => store
                        }
                    })
                })
            });

            app.use('/graphql', (0, _expressGraphql2.default)({
                schema,
                graphiql: true
            }));

            (0, _graphql.graphql)(schema, _utilities.introspectionQuery).then(function (json) {
                _fs2.default.writeFile('../data/schema.json', JSON.stringify(json, null, 2));
            });
        });
    }
};

exports.default = out;
//# sourceMappingURL=schema.fromdb.js.map