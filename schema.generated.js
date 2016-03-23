import {GraphQLSchema,GraphQLObjectType,GraphQLInt,GraphQLString,GraphQLList,GraphQLBoolean} from 'graphql'
let listOptions = new GraphQLObjectType({    name: 'ListOptions',    fields:() => ({        pageNum:{type:GraphQLInt},        pageSize:{type:GraphQLInt},        sort:{type:GraphQLString},        sortOrder:{type:GraphQLString},        format:{type:GraphQLString}    })});
