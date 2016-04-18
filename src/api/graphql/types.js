import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLBoolean
} from 'graphql';


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

let predicate =  new GraphQLObjectType({
    name: 'Predicate',
    fields:() => ({
        lookup:{type:GraphQLString},
        direction:{type:GraphQLString},//in/out        
        symmetrical:{type:GraphQLBoolean},
        force:{type:GraphQLString}//Attract/Repel
    })
});


let classRelationship = new GraphQLObjectType({
    name: 'Relationship',
    fields:()=>({
        predicate:{type:predicate},
        items:{type:new GraphQLList(classtype)},
        })
});

let property = new GraphQLObjectType({
    name: 'Property',
    fields:()=>({
        name:{type:GraphQLString},
        type:{type:GraphQLString},
        required:{type:GraphQLBoolean},
        readonly:{type:GraphQLBoolean}
        })
});

let classtype = new GraphQLObjectType({
    name: 'Class',
    fields:() => ({
  
        lookup:{type:GraphQLString},
        extends:{type:new GraphQLList(classtype)},
        properties:{type:new GraphQLList(property)},
        relationships:{type:new GraphQLList(classRelationship)},
    })
});

let lookup=new GraphQLObjectType({
    name: 'Lookup',
    fields:() => ({
        id:{type:GraphQLInt},
        type:{type:GraphQLString},
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

let edgeProps=new GraphQLObjectType({
    name: 'EdgeProps',
    fields:{
        weight:{type:GraphQLInt}
        }
});

let edge = new GraphQLObjectType({
    name: 'Edge',
    fields:{
        id:{type:GraphQLInt},
        start:{type:GraphQLInt},
        end:{type:GraphQLInt}, 
        predicate:{type:GraphQLString},
        properties:{type:edgeProps  }
        }
});

let graph = new GraphQLObjectType({
    name: 'Graph',
    fields:{
        nodes:{type:new GraphQLList(lookup)},
        edges:{type:new GraphQLList(edge)},
        }
});


export default {
    /*
    listOptions:listOptions,
    picture:picture,
    node:node,
    relationship:relationship,
    lookup:lookup,*/
    classtype:classtype,
    graph:graph
 
};