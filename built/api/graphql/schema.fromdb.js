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

        for (var tkey in classDefs) {

            let t = classDefs[tkey];

            _fields[tkey] = {
                type: new _graphql.GraphQLObjectType({
                    name: tkey,
                    description: t.description,
                    fields: () => {
                        let p = makeGraphQLprops(t.props);

                        for (let reltypekey in t.reltypes) {
                            let reltype = t.reltypes[reltypekey];
                            let objtype = _fields[reltype.class].type;
                            p[reltypekey] = {
                                type: new _graphql.GraphQLList(objtype)
                            };

                            if (!reltype.nolazy || reltype.direction === 'in') {
                                //only respect nolazy for outbound rleationships ? eg enable getting image.image_of..>picture
                                p[reltypekey].resolve = function (obj) {
                                    return node.getRelatedItems(obj, reltype, t.reltypes, classDefs);
                                };
                            }
                        }

                        return p;
                    }
                }),
                args: { id: { type: _graphql.GraphQLString } },
                resolve: function resolve(_, args) {
                    return node.get(args.id);
                }
            };
        }

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