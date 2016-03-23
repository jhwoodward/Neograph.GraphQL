import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLBoolean
} from 'graphql';



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

let predicate =  new GraphQLObjectType({
    name: 'Predicate',
    fields:() => ({
        lookup:{type:GraphQLString},
        direction:{type:GraphQLString},//in/out        
        symmetrical:{type:GraphQLBoolean},
        force:{type:GraphQLString}//Attract/Repel
    })
});

let lookup=new GraphQLObjectType({
    name: 'Lookup',
    fields:() => ({
        id:{type:GraphQLInt},
        type:{type:GraphQLString},
        label:{type:GraphQLString},
        lookup:{type:GraphQLString}
    })
});

let relationship = new GraphQLObjectType({
    name: 'Relationship',
    fields:{
        predicate:{type:predicate},
        items:{type:new GraphQLList(lookup)},
        }
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

export default {
    listOptions:listOptions,
    picture:picture,
    node:node,
    relationship:relationship,
    lookup:lookup
};