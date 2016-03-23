import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList
} from 'graphql';

import types from './types';

var config = require('../../api.config.js');
//import picture from '../picture';
var picture = require('../picture')(config);
var node = require('../picture')(config);

let pictureList = new GraphQLObjectType({
    name: 'Pictures',
    fields:() => ({
        options:{type:types.listOptions},
        q:{type:GraphQLString},
        count:{type:GraphQLInt},
        items:{type: new GraphQLList(types.picture)}
    })
});


// Define our schema, with one top level field, named `user`, that
// takes an `id` argument and returns the User with that ID.
/*
var schema = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: 'Query',
    fields: {
      user: {
        type: userType,
        args: {
          id: { type: graphql.GraphQLString }
        },
        resolve: function (_, args) {
          return data[args.id];
        }
      }
    }
  })
});
*/

let schema = new GraphQLSchema({
   query:new GraphQLObjectType({
        name: 'Query',
       
        fields:() => ({
            pictures:{
                type:pictureList,
                args:{
                    by:{type:GraphQLString },
                    of:{type:GraphQLString },
                    labelled:{type:GraphQLString},
                    propName:{type:GraphQLString},
                    propVal:{type:GraphQLString}
                    
                },
                resolve: (_,args) => 
                {
                    if (args.by){
                        return  picture.list.predicate({id:args.by,predicate:"BY"});
                    }
                    if (args.of){
                        return  picture.list.predicate({id:args.of,predicate:"OF"});
                    }
                    if (args.labelled){
                        return  picture.list.labelled({labels:args.labelled});
                    }
                }
               
            }
            ,
            node:{
                type:types.node,
                args:{
                    id:{type:GraphQLString }
                },
                resolve: (_,args) => {
                    console.log(args);
                    return node.getWithRels(args.id);
                }
            }
        })
    })
});

export default schema;



