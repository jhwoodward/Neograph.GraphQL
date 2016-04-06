import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList
} from 'graphql';
import {graphql} from 'graphql';
import {introspectionQuery} from 'graphql/utilities';
import fs from 'fs';

import GraphQLHTTP from 'express-graphql';
import types from './types.js';
//import picture from '../picture';
var config = require('../../api.config.js');


// import classDefs from './classDefs';
var picture = require('../picture')(config);
var node = require('../node')(config);
var classDef = require('../class')(config);
let lodash = require("lodash");

let makeGraphQLListArgs = (t)=>{
    
    let out =  {};
    
      for (let pkey in t.props){
        let p = t.props[pkey];
        switch (p.type){
            case "boolean":
                out[pkey] = {type:GraphQLBoolean};
                break;
            case "number":
                out[pkey] = {type:GraphQLInt};
                break;
         //   case "array[string]":
         //       out[pkey] ={type:new GraphQLList(GraphQLString)};
         //       break;
            default :
                out[pkey] = {type:GraphQLString};
        }
    }
    
     for (let reltypekey in t.reltypes)
    {
        out[reltypekey]={type:GraphQLString};
     }
    
    return out;
    
    
}


let makeGraphQLprops = (props) =>{
    
    let out = {};
    for (let pkey in props){
        let p = props[pkey];
        switch (p.type){
            case "boolean":
                out[pkey] = {type:GraphQLBoolean};
                break;
            case "number":
                out[pkey] = {type:GraphQLInt};
                break;
            case "array<string>":
                out[pkey] ={type:new GraphQLList(GraphQLString)};
                break;
            default :
                out[pkey] = {type:GraphQLString};
        }
    }
            
    return out;
};

let generateFields = () => {


   return classDef.refreshList().then((classDefs)=>{
        
    
        
        let fields = {};
           
         lodash.forOwn(classDefs,t=>{
             
             t.graphQLObjectType = new GraphQLObjectType(
                {
                    name:t.lookup,
                    description:t.description,
                    fields:() => {
                        let p = makeGraphQLprops(t.props);
                        
                        for (let reltypekey in t.reltypes)
                        {
                            let reltype = t.reltypes[reltypekey];
                            let objtype = classDefs[reltype.class].graphQLObjectType;
                            p[reltypekey] = {
                                type: new GraphQLList(objtype)
                            };
                            let args =makeGraphQLListArgs(classDefs[reltype.class]);

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
           
            fields[t.lookup]={//t.plural ? -- from db
                type:new GraphQLList(t.graphQLObjectType),
                 args: makeGraphQLListArgs(t),
                 resolve: (source, args, root) => {
                        let selections = root.fieldASTs[0].selectionSet.selections;
                        return node.list.search(t,args,selections,root.fragments,classDefs);
                    
                        
                     //   ;//.catch((err)=>{throw err})
                       // return data;
                }   
            };
            
         
            
 
            
        });
        
        /*
        fields["GraphQuery"]=new GraphQLObjectType({
            name:"GraphQuery",
            fields:()=> ({
        node:{type:types.graph},
        provenance:{type:types.graph},
        period:{type:types.graph}

    })
        });
        */
        return fields;
        
    });

};

var out = {

    load:(app)=>{
        
        generateFields().then((fields)=>{
            
            let storeType = new GraphQLObjectType({
                    name: 'Store',
                    fields:() => fields
                });
         
            let store = {};
            
            let schema = new GraphQLSchema({
              query:new GraphQLObjectType({
                    name: 'Query',
                    fields:() => ({
                        store:{
                            type:storeType,
                            resolve:()=>store
                        }
                    })
                })
            });
        
            
             app.use('/graphql',GraphQLHTTP({
                schema,
                graphiql:true
            }));
            
            graphql(schema,introspectionQuery).then(function(json){
                fs.writeFile('../data/schema.json',JSON.stringify(json,null,2));
            })
                
        });   
    }
};

export default out;



