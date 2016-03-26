'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

let listOptions = new _graphql.GraphQLObjectType({
    name: "ListOptions",
    fields: () => ({
        pageNum: { type: _graphql.GraphQLInt },
        pageSize: { type: _graphql.GraphQLInt },
        sort: { type: _graphql.GraphQLString },
        sortOrder: { type: _graphql.GraphQLString },
        format: { type: _graphql.GraphQLString }
    })
});

let imageDetails = new _graphql.GraphQLObjectType({
    name: 'ImageDetails',
    fields: () => ({
        width: { type: _graphql.GraphQLInt },
        height: { type: _graphql.GraphQLInt },
        url: { type: _graphql.GraphQLString }
    })
});

let imageSource = new _graphql.GraphQLObjectType({
    name: 'ImageSource',
    fields: () => ({
        name: { type: _graphql.GraphQLString },
        ref: { type: _graphql.GraphQLString },
        url: { type: _graphql.GraphQLString }
    })
});

let image = new _graphql.GraphQLObjectType({
    name: 'Image',
    fields: () => ({
        id: { type: _graphql.GraphQLInt },
        size: { type: _graphql.GraphQLInt },
        thumb: { type: imageDetails },
        full: { type: imageDetails },
        high: { type: imageDetails },
        source: { type: imageSource }
    })
});

let picture = new _graphql.GraphQLObjectType({
    name: 'Picture',
    fields: () => ({
        id: { type: _graphql.GraphQLInt },
        title: { type: _graphql.GraphQLString },
        image: { type: image }
    })
});

let predicate = new _graphql.GraphQLObjectType({
    name: 'Predicate',
    fields: () => ({
        lookup: { type: _graphql.GraphQLString },
        direction: { type: _graphql.GraphQLString }, //in/out       
        symmetrical: { type: _graphql.GraphQLBoolean },
        force: { type: _graphql.GraphQLString } //Attract/Repel
    })
});

let lookup = new _graphql.GraphQLObjectType({
    name: 'Lookup',
    fields: () => ({
        id: { type: _graphql.GraphQLInt },
        type: { type: _graphql.GraphQLString },
        label: { type: _graphql.GraphQLString },
        lookup: { type: _graphql.GraphQLString }
    })
});

let relationship = new _graphql.GraphQLObjectType({
    name: 'Relationship',
    fields: {
        predicate: { type: predicate },
        items: { type: new _graphql.GraphQLList(lookup) }
    }
});

let node = new _graphql.GraphQLObjectType({
    name: 'Node',
    fields: () => ({
        id: { type: _graphql.GraphQLInt },
        type: { type: _graphql.GraphQLString },
        description: { type: _graphql.GraphQLString },
        label: { type: _graphql.GraphQLString },
        lookup: { type: _graphql.GraphQLString },
        text: { type: _graphql.GraphQLString },
        name: { type: _graphql.GraphQLString },
        yearFrom: { type: _graphql.GraphQLInt },
        yearTo: { type: _graphql.GraphQLInt },
        labels: { type: new _graphql.GraphQLList(_graphql.GraphQLString) },
        image: { type: image },
        relationships: { type: new _graphql.GraphQLList(relationship) }
    })
});

exports.default = {
    listOptions: listOptions,
    picture: picture,
    node: node,
    relationship: relationship,
    lookup: lookup
};
//# sourceMappingURL=types.js.map