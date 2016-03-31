import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList
} from 'graphql';



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
    
    let out =  makeGraphQLprops(t.props);
    
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
             
             let single = new GraphQLObjectType(
                {
                    name:t.lookup,
                    description:t.description,
                    fields:() => {
                        let p = makeGraphQLprops(t.props);
                        
                        for (let reltypekey in t.reltypes)
                        {
                            let reltype = t.reltypes[reltypekey];
                            let objtype = fields[reltype.class].type;
                            p[reltypekey] = {
                                type: new GraphQLList(objtype)
                            };
                            
                            p[reltypekey].args = makeGraphQLListArgs(classDefs[reltype.class]);

                        }
                        
                        return p;
                    }
                });



            fields[t.lookup]={
                type: single,
                 args:{
                     lookup:{type:GraphQLString},
                     id:{type:GraphQLInt}
                } ,
                 resolve:function(source,args,root){
                     
                     let selections = root.fieldASTs[0].selectionSet.selections;
                     return node.list.search(t,args,selections,classDefs).then(data=>{return data[0];});
                     
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
      
           
            fields[t.lookup+'s']={//t.plural ? -- from db
                type:new GraphQLList(single),
                 args: makeGraphQLListArgs(t),
                 resolve: (source, args, root) => {
                        let selections = root.fieldASTs[0].selectionSet.selections;
                        return node.list.search(t,args,selections,classDefs);//.catch((err)=>{throw err})
                 } 
                 
                 
                  
            };
            
        });
        
        return fields;
        
    });

};

var out = {

    load:(app)=>{
        
        generateFields().then((fields)=>{
            
            let schema = new GraphQLSchema({
            query:new GraphQLObjectType({
                    name: 'Query',
                    fields:() => fields
                })
            });
            
             app.use('/graphql',GraphQLHTTP({
                schema:schema,
                graphiql:true
            }));
                
        });   
    }
};

export default out;



