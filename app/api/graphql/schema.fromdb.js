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
           
        for (var tkey in classDefs){
            
            let t = classDefs[tkey];

            fields[tkey]={
                type:new GraphQLObjectType(
                    {
                        name:tkey,
                        description:t.description,
                        fields:() => {
                            let p = makeGraphQLprops(t.props);
                          
                            for (let reltypekey in t.reltypes)
                            {
                                let reltype = t.reltypes[reltypekey];
                                let objtype = fields[reltype.class].type; 
                                p[reltypekey] = {
                                    type:new GraphQLList(objtype)
                                    };
                                    
                                 if (!reltype.nolazy || reltype.direction==='in') {//only respect nolazy for outbound rleationships ? eg enable getting image.image_of..>picture
                                        p[reltypekey].resolve=function(obj){
                                        return node.getRelatedItems(obj,reltype,t.reltypes,classDefs);
                                    }  
                                 } 
                                    
                            }
                          
                            return p;
                        }
                    }),
                 args:{id:{type:GraphQLString}} ,
                 resolve:function(_,args){
                     return node.get(args.id);
                 }  
            };
            
        }
        
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



