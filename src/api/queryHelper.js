import _ from 'lodash';
import changeCase from 'change-case';
import cypher from './cypher.js';
import utils from './utils';
import Immutable from 'immutable';
import merge from 'deepmerge';
 
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

        }
            
       neoTarget(reltype,level){
            let alias = "t" + level;
            if (reltype.target){
                return "(" + alias + ":" + reltype.class + " {Lookup:'" + reltype.target + "'}) ";
            }
            else{
                return "(" + alias + ":" + reltype.class + ")";
            }
        }
         
       neoWith(query){
          let aliases = query.usedAliases.concat(query.relAliases)
          if (aliases && aliases.length)
          {
              return " with " + aliases.join(",") + " ";
          }
          else return "";
      }       
                
      neo(d){
            let s = d.s;
            let level = d.level || 0;
            let aliasprefix = d.aliasprefix || "a";
            let parentAlias = d.parentAlias;
            let query = d.query || d.s;//base query
            let params={};
            let alias = aliasprefix + level;
            let withAliases = "";

            let q = this.neoWith(query);

            let match = alias + ":" + s.type.lookup;
            if (s.args.props.labels){
                match += ":" + s.args.props.labels.target.split(",").join(":");
            }
            q += " match (" + match + ") ";

            query.usedAliases.push(alias);
            
            // args.reltypes form additional filtering via relationship
            // args.props form additional filtering via where clause
            _.forOwn(s.args.reltypes,reltype=>{
                q+= this.neoWith(query) + " match (" + alias + ") " + this.neoRelationship(reltype) + this.neoTarget(reltype,level);
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
                q += this.neoWith(query) + " match (" + parentAlias + ") " + this.neoRelationship(s.reltype,relAlias) + "(" + alias + ") ";
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
     
            
         recursiveSelection(d){

               if (d.s.selectionSet && d.s.kind!=="FragmentSpread"){
                    
                    let reltypekey=d.s.name.value;
                    let reltype = d.parentType.reltypes[reltypekey];
                    let type = this.classDefs[reltype.class];
                    let args = d.s.arguments.reduce(function(acc,item){
                        acc[item.name.value]=item.value.value;
                        return acc;
                    },{});

                    let thisBranch = d.selection[reltypekey]  = {
                        type:type   
                        ,
                        args:this.reduceArgs(type,args)
                        ,
                        reltype:reltype
                        ,
                        selection:{}
                    };
                     
                     let neoArgs = {
                         s:thisBranch,
                         level:d.level,
                         aliasprefix:d.aliasPrefix,
                         parentAlias:d.parentAlias,
                         query:d.query
                     }   
                     
                    thisBranch.neo = this.neo(neoArgs);

                    d.s.selectionSet.selections.forEach((sNext,i)=>{
                        
                        let selArgs = {
                            s:sNext,
                            selection:thisBranch.selection,
                            parentType:type,
                            level: d.level+1,
                            aliasPrefix: this.aliasPrefixes[i],
                            parentAlias: thisBranch.neo.alias,
                            query: d.query
                        }
                         this.recursiveSelection(selArgs);
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
                relAliases:[]
                ,
                usedAliases:[]
                ,
                selections: this.mergeFragments(selections,fragments)
            };

            query.neo = this.neo({s:query});

            query.selections.forEach((s,i)=>{
                
                   let selArgs = {
                            s:s,
                            selection:query.selection,
                            parentType:baseType,
                            level: 1,
                            aliasPrefix: this.aliasPrefixes[i],
                            parentAlias: query.neo.alias,
                            query: query
                        }
                        
                 this.recursiveSelection(selArgs);
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
