'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

var _types = require('./types');

var _types2 = _interopRequireDefault(_types);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var config = require('../../api.config.js');
//import picture from '../picture';
var picture = require('../picture')(config);
var node = require('../picture')(config);

let pictureList = new _graphql.GraphQLObjectType({
    name: 'Pictures',
    fields: () => ({
        options: { type: _types2.default.listOptions },
        q: { type: _graphql.GraphQLString },
        count: { type: _graphql.GraphQLInt },
        items: { type: new _graphql.GraphQLList(_types2.default.picture) }
    })
});

let schema = new _graphql.GraphQLSchema({
    query: new _graphql.GraphQLObjectType({
        name: 'Query',

        fields: () => ({
            pictures: {
                type: pictureList,
                args: {
                    by: { type: _graphql.GraphQLString },
                    of: { type: _graphql.GraphQLString },
                    labelled: { type: _graphql.GraphQLString },
                    propName: { type: _graphql.GraphQLString },
                    propVal: { type: _graphql.GraphQLString }

                },
                resolve: (_, args) => {
                    if (args.by) {
                        return picture.list.predicate({ id: args.by, predicate: "BY" });
                    }
                    if (args.of) {
                        return picture.list.predicate({ id: args.of, predicate: "OF" });
                    }
                    if (args.labelled) {
                        return picture.list.labelled({ labels: args.labelled });
                    }
                }

            },

            node: {
                type: _types2.default.node,
                args: {
                    id: { type: _graphql.GraphQLString }
                },
                resolve: (_, args) => {
                    console.log(args);
                    return node.getWithRels(args.id);
                }
            }
        })
    })
});

exports.default = schema;
//# sourceMappingURL=schema.js.map