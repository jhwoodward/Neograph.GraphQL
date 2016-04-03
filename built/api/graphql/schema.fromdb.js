'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

var _expressGraphql = require('express-graphql');

var _expressGraphql2 = _interopRequireDefault(_expressGraphql);

var _types = require('./types.js');

var _types2 = _interopRequireDefault(_types);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//import picture from '../picture';
var config = require('../../api.config.js');

// import classDefs from './classDefs';
var picture = require('../picture')(config);
var node = require('../node')(config);
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
                    return node.list.search(t, args, selections, classDefs); //.catch((err)=>{throw err})
                }
            };
        });

        fields["Classes"] = {
            type: new _graphql.GraphQLList(_types2.default.classtype),
            resolve: (source, args) => {}
        };

        return fields;
    });
};

var out = {

    load: app => {

        generateFields().then(_fields => {

            let schema = new _graphql.GraphQLSchema({
                query: new _graphql.GraphQLObjectType({
                    name: 'Query',
                    fields: () => _fields
                })
            });

            app.use('/graphql', (0, _expressGraphql2.default)({
                schema: schema,
                graphiql: true
            }));
        });
    }
};

exports.default = out;
//# sourceMappingURL=schema.fromdb.js.map