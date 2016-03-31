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

    let out = makeGraphQLprops(t.props);

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
            default:
                out[pkey] = { type: _graphql.GraphQLString };
        }
    }

    return out;
};

let generateFields = () => {

    return classDef.refreshList().then(classDefs => {

        let _fields = {};

        lodash.forOwn(classDefs, t => {

            let single = new _graphql.GraphQLObjectType({
                name: t.lookup,
                description: t.description,
                fields: () => {
                    let p = makeGraphQLprops(t.props);

                    for (let reltypekey in t.reltypes) {
                        let reltype = t.reltypes[reltypekey];
                        let objtype = _fields[reltype.class].type;
                        p[reltypekey] = {
                            type: new _graphql.GraphQLList(objtype)
                        };

                        p[reltypekey].args = makeGraphQLListArgs(classDefs[reltype.class]);
                    }

                    return p;
                }
            });

            _fields[t.lookup] = {
                type: single,
                args: {
                    lookup: { type: _graphql.GraphQLString },
                    id: { type: _graphql.GraphQLInt }
                },
                resolve: function resolve(source, args, root) {

                    let selections = root.fieldASTs[0].selectionSet.selections;
                    return node.list.search(t, args, selections, classDefs).then(data => {
                        return data[0];
                    });

                    //.catch((err)=>{throw err})

                    /*
                    if (args.lookup){
                          return node.get(args.lookup);
                    }
                    if (args.id){
                          return node.get(args.id);
                    }
                    */
                }
            };

            _fields[t.lookup + 's'] = { //t.plural ? -- from db
                type: new _graphql.GraphQLList(single),
                args: makeGraphQLListArgs(t),
                resolve: (source, args, root) => {
                    let selections = root.fieldASTs[0].selectionSet.selections;
                    return node.list.search(t, args, selections, classDefs); //.catch((err)=>{throw err})
                }

            };
        });

        return _fields;
    });
};

var out = {

    load: app => {

        generateFields().then(_fields2 => {

            let schema = new _graphql.GraphQLSchema({
                query: new _graphql.GraphQLObjectType({
                    name: 'Query',
                    fields: () => _fields2
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