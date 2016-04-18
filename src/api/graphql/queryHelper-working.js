var _ = require("lodash");
var changeCase = require("change-case");
var config = require('../../api.config.js');
var cypher = require('../cypher.js')(config);
var utils = require("../utils")(config);
 var Immutable = require("immutable");
  var merge = require('deepmerge');
 
class QueryHelper {
    
    constructor(classDefs){
        this.classDefs = classDefs;
        this.aliasPrefixes = ("a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z").split(",");
    }
 
       neoRelationship(reltype,relAlias){
             
            relAlias = relAlias || "";
            
            if (reltype.predicate.symmetrical){
            return " - [" + relAlias + ":" + reltype.predicate.lookup + "] - ";
            }
            else if (reltype.direction === "out"){
            return " - [" + relAlias + ":" + reltype.predicate.lookup + "] -> ";
            }
            else{
            return " <- [" + relAlias + ":" + reltype.predicate.lookup + "] - ";
            }
            //  q+= "(m:Label {Label:'" + rel.target + "'}) ";
        }
            
       neoTarget(reltype,level){
                
            let alias = "t" + level;
            
            if (reltype.target){
                return "(" + alias + ":" + reltype.class + " {Lookup:'" + reltype.target + "'}) ";
            }
            else{
                return "(" + alias + ":" + reltype.class + ")";
            }
            //  q+= "(m:Label {Label:'" + rel.target + "'}) ";
        }
                
                
      neo(s,level,aliases,aliasprefix,parentAlias,query){

            level = level || 0;
            aliases = aliases || new Array();
            aliasprefix = aliasprefix || "a";
            query = query || s;//base query
            let q = "";
            let params={};
            let alias = aliasprefix + level;
            let withAliases = "";

            if (aliases.length){
                q = " with " + aliases.join(",") + " ";
            }
            if (query.relAliases.length){//not currently in use but might be needed if graph type if required at some point
                q+="," + query.relAliases.join(",");
            }
            
            aliases.push(alias);
            withAliases = " with " + aliases.join(",") + " ";
            if (query.relAliases.length){
                withAliases+="," + query.relAliases.join(",");
            }
            
            let match = alias + ":" + s.type.lookup;
            if (s.args.props.labels){
                match += ":" + s.args.props.labels.target.split(",").join(":");
            }
            q += " match (" + match + ") ";

            // args.reltypes form additional filtering via relationship
            // args.props form additional filtering via where clause
            
            _.forOwn(s.args.reltypes,reltype=>{
                q+= withAliases + " match (" + alias + ") " + this.neoRelationship(reltype) + this.neoTarget(reltype,level);
            })

            let cnt = 0;

            _.forOwn(s.args.props,prop=>{
                if (prop.name != "labels"){
                    if (cnt ===0){
                        q +=" where ";
                    }
                    else{
                        q+= " and ";
                    }
                    
                    if (prop.name === "id"){
                        q+= "ID(" + alias + ") = {" + alias + prop.name + "} ";
                    }
                    else {
                    let comparer = "=";
                    if (prop.target.indexOf("*") === 0 || prop.target.indexOf("*")===prop.target.length-1 ){
                        comparer = "=~";
                        prop.target.replaceAll('*','.*');
                    }
                    q+= alias + "." + changeCase.pascalCase(prop.name) + " " + comparer + " {" + alias + prop.name + "} ";
                    }
                    
                
                    if (prop.type==="number"){
                        params[alias + prop.name] = parseInt(prop.target);
                    }
                    else{
                        params[alias + prop.name] = prop.target;
                    }
                 
                    
                    
                    cnt +=1;
                }
            })
            
            
            // if (s.reltype) then query acts on a relationship with parent alias
            // (otherwise it starts with just the type (base query))
            if (s.reltype){
                let relAlias = parentAlias + "_" + alias;
                q += withAliases + " match (" + parentAlias + ") " + this.neoRelationship(s.reltype,relAlias) + "(" + alias + ") ";
                query.relAliases.push(relAlias);
            }
            
            //accumulate query and params
            query.q += " " + q + " ";
            _.assignIn(query.params,params);

            return {
                alias:alias,
                q:q,
                params:params
            }
        }
     
            
         recursiveSelection(s,selection,parentType,level,aliases,aliasPrefix,parentAlias,query){
                
               if (s.selectionSet && s.kind!=="FragmentSpread"){

                    let reltype=s.name.value;
                    let type = this.classDefs[parentType.reltypes[reltype].class];
                    let args = _.mapValues(
                        _.keyBy(s.arguments.map(
                            arg=>({key:arg.name.value,value:arg.value.value})),'key')
                            ,val=>val.value);
                            
                    selection[reltype] = {
                        type:type   
                        ,
                        args:this.reduceArgs(type,args)
                        ,
                        reltype:parentType.reltypes[reltype]
                        ,
                        selection:{}
                    };
                        
                    selection[reltype].neo = this.neo(selection[reltype],level,aliases,aliasPrefix,parentAlias,query);
                    s.selectionSet.selections.forEach((sNext,i)=>{
                         this.recursiveSelection(sNext,selection[reltype].selection,type,level+1,aliases,this.aliasPrefixes[i],selection[reltype].neo.alias,query);
                    })
                  }
            }
            
            
 
            
      reduceArgs(type,args){
          
           //args are used for filtering
           //They need to be split into props & reltypes 
           //as filtering is implemented differently for each
           //- props always relate to fields 
           //- reltypes always relate to relationships
            
         let argsArray = [];
          for (var key in args){
                argsArray.push({"key":key,"value":args[key]});
          }
          
          let reduce = function(type) {
            return argsArray.reduce(function (acc,item){
                if (type[item.key]){
                    acc[item.key] = _.assignIn(type[item.key],{ target: item.value});
                }
                return acc;
            },{});
          }

           return {
                    reltypes:reduce(type.reltypes),
                    props:reduce(type.props)
            }
      }
      
      mergeFragments(selections,fragments){
          
           let merge = (selections) =>{
                
                let out = (new Array()).concat(selections);
                //merge fragments into selections
                selections.forEach(s=>{
                    if (s.kind==="FragmentSpread"){
                        let fragSelections = fragments[s.name.value].selectionSet.selections;
                        fragSelections = merge(fragSelections);
                        out = out.concat(fragSelections);
                    }
                })
                return out;
            }

            return merge(selections);

      }
      
          
      
      
    resolve(baseType,baseArgs,selections,fragments){

           

            let query = {
                type:baseType,
                args: this.reduceArgs(baseType,baseArgs)
                ,
                selection:{}
                ,
                q:"",//the query string that will be sent to neo4j
                params:{}//the params object that will be sent to neo4j
                ,
                relAliases:new Array()
            };

            selections = this.mergeFragments(selections,fragments);

            query.neo = this.neo(query);
            
            query.usedAliases = [query.neo.alias];
            selections.forEach((s,i)=>{
                 this.recursiveSelection(s,query.selection,baseType,1,query.usedAliases,this.aliasPrefixes[i],query.neo.alias,query);
            });
          
           //add return statement
           query.q += " return " + query.usedAliases.join(",");
           if (query.relAliases.length){
               query.q+="," + query.relAliases.join(",");
           }
           let ids = query.usedAliases.map(alias=>{return "ID(" + alias + ")";})
           query.q += "," + ids.join(",");
           let labels = query.usedAliases.map(alias=>{return "LABELS(" + alias + ")";})
           query.q += "," + labels.join(",");

           return query;
    }
    
    execute(query){
        
         return cypher.executeStatements([cypher.buildStatement(query.q,"row",query.params)]).then(function(results){
                let data = [];
                results[0].data.forEach(d=>{
                    let row = {};
                    let cnt = 0;
                    results[0].columns.forEach(col =>{
                        if (col.indexOf("ID(") === -1 && col.indexOf("LABELS(") === -1)
                        {
                            row[col]=utils.camelCase(d.row[cnt]);
                        }
                        else if (col.indexOf("ID(")===0){
                            let idForCol = col.replace("ID(","").replace(")","");
                            row[idForCol].id = d.row[cnt];
                        }
                        else if (col.indexOf("LABELS(")===0){
                            let labelsForCol = col.replace("LABELS(","").replace(")","");
                            row[labelsForCol].labels=d.row[cnt];
                        }
                  
                   
                        cnt+=1;
                    })
                    data.push(row)
                });
                
                let grouped = _.groupBy(data,(item)=>{return item.a0.id; });

                let reltypePrefix = "RELTYPE_";

                function fill(selection,row,obj){
                        _.forOwn(selection,(reltype,reltypekey)=>{
                            let k = reltypePrefix + reltypekey;
                            if (!obj[k]){
                                obj[k]={};
                            }
                            obj[k][row[reltype.neo.alias].id] = row[reltype.neo.alias];
                            fill(reltype.selection,row,obj[k][row[reltype.neo.alias].id]);
                        });
                    }
            
                let transformed = {};     
                
                _.forOwn(grouped,item=>{
                        item.forEach(row=>{
                            let out = row[query.neo.alias];
                            fill(query.selection,row,out);
                            if (transformed[out.id]){
                                transformed[out.id] = merge(transformed[out.id],out);
                            }
                            else{
                            transformed[out.id]=out;
                            }
                        });
                })

                function toArray(item){
                    _.forOwn(item,(val,key)=>{
                        if (key.indexOf(reltypePrefix) === 0)
                        {
                            let k= key.replace(reltypePrefix,"");
                            item[k]=[];
                            _.forOwn(val,(val2,key2)=>{
                                toArray(val2);
                                item[k].push(val2);
                            });
                        }
                    })
                }

                _.forOwn(transformed,item=>{
                    toArray(item);
                });

                return _.values(transformed);       
            });
        
        
        
        
        
    }
          
    
    
    
    
}


export default (classDefs) => new QueryHelper(classDefs);