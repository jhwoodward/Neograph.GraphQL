'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

/*
let listOptions =  new GraphQLObjectType({
    name: "ListOptions",
    fields:() => ({
        pageNum:{type:GraphQLInt},
        pageSize:{type:GraphQLInt},
        sort:{type:GraphQLString},
        sortOrder:{type:GraphQLString},
        format:{type:GraphQLString}
    })
});

let imageDetails = new GraphQLObjectType({
    name: 'ImageDetails',
    fields:() => ({
        width:{type:GraphQLInt},
        height:{type:GraphQLInt},
        url:{type:GraphQLString}
    })
});

let imageSource =  new GraphQLObjectType({
    name: 'ImageSource',
    fields:() => ({
         name: {type:GraphQLString},
         ref: {type:GraphQLString},
         url: {type:GraphQLString}
    })
});

let image = new GraphQLObjectType({
    name: 'Image',
    fields:() => ({
        id:{type:GraphQLInt},
        size:{type:GraphQLInt},
        thumb:{type:imageDetails},
        full:{type:imageDetails},
        high:{type:imageDetails},
        source: {type:imageSource}
    })
});

let picture =  new GraphQLObjectType({
    name: 'Picture',
    fields:() => ({
        id:{type:GraphQLInt},
        title:{type:GraphQLString},
        image:{type:image}
    })
});





let node= new GraphQLObjectType({
    name: 'Node',
    fields:() => ({
        id:{type:GraphQLInt},
        type:{type:GraphQLString},
        description:{type:GraphQLString},
        label:{type:GraphQLString},
        lookup:{type:GraphQLString},
        text:{type:GraphQLString},
        name:{type:GraphQLString},
        yearFrom:{type:GraphQLInt},
        yearTo:{type:GraphQLInt},
        labels:{type:new GraphQLList(GraphQLString)},
        image:{type:image},
        relationships:{type:new GraphQLList(relationship)}
    })
});
*/

let predicate = new _graphql.GraphQLObjectType({
    name: 'Predicate',
    fields: () => ({
        lookup: { type: _graphql.GraphQLString },
        direction: { type: _graphql.GraphQLString }, //in/out       
        symmetrical: { type: _graphql.GraphQLBoolean },
        force: { type: _graphql.GraphQLString } //Attract/Repel
    })
});

let classRelationship = new _graphql.GraphQLObjectType({
    name: 'Relationship',
    fields: () => ({
        predicate: { type: predicate },
        items: { type: new _graphql.GraphQLList(classtype) }
    })
});

let property = new _graphql.GraphQLObjectType({
    name: 'Property',
    fields: () => ({
        name: { type: _graphql.GraphQLString },
        type: { type: _graphql.GraphQLString },
        required: { type: _graphql.GraphQLBoolean },
        readonly: { type: _graphql.GraphQLBoolean }
    })
});

let classtype = new _graphql.GraphQLObjectType({
    name: 'Class',
    fields: () => ({

        lookup: { type: _graphql.GraphQLString },
        extends: { type: new _graphql.GraphQLList(classtype) },
        properties: { type: new _graphql.GraphQLList(property) },
        relationships: { type: new _graphql.GraphQLList(classRelationship) }
    })
});

let lookup = new _graphql.GraphQLObjectType({
    name: 'Lookup',
    fields: () => ({
        id: { type: _graphql.GraphQLInt },
        type: { type: _graphql.GraphQLString },
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

let edgeProps = new _graphql.GraphQLObjectType({
    name: 'EdgeProps',
    fields: {
        weight: { type: _graphql.GraphQLInt }
    }
});

let edge = new _graphql.GraphQLObjectType({
    name: 'Edge',
    fields: {
        id: { type: _graphql.GraphQLInt },
        start: { type: _graphql.GraphQLInt },
        end: { type: _graphql.GraphQLInt },
        predicate: { type: _graphql.GraphQLString },
        properties: { type: edgeProps }
    }
});

let graph = new _graphql.GraphQLObjectType({
    name: 'Graph',
    fields: {
        nodes: { type: new _graphql.GraphQLList(lookup) },
        edges: { type: new _graphql.GraphQLList(edge) }
    }
});

exports.default = {
    /*
    listOptions:listOptions,
    picture:picture,
    node:node,
    relationship:relationship,
    lookup:lookup,*/
    classtype: classtype,
    graph: graph

};
