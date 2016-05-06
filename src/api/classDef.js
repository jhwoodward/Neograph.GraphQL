import extend from 'extend';
import cypher from './cypher';
import utils from './utils';
import changeCase from 'change-case';
import predicate from './predicate';
import _ from 'lodash';
import merge from 'deepmerge';

const buildSchema = (predicates) => {

        let props = "match (n:Class) optional match n - [r:PROPERTY] -> (p:Property) return n,collect(r),collect(p)";
        props += " union match (n:Class) - [:EXTENDS*] -> (b:Class)-[r:PROPERTY]->(p:Property) return n,collect(r),collect(p)";
        
        //backwards - for graphql return type only
        props += " union match (n:Class) <- [:EXTENDS*] - (b:Class)-[r:PROPERTY]->(p:Property) return n,collect(r),collect(p)";

        let relTypes = "match (n:Class ) -[r] -> (c:Class)  where type(r)<>'EXTENDS'";
        relTypes += "  return n.Lookup,collect(type(r)),'out' as direction,collect(c.Lookup),collect(r)";
        relTypes += " union match (n:Class ) - [:EXTENDS*] -> (d:Class) - [r] -> (c:Class)  where type(r)<>'EXTENDS' ";
        relTypes += "  return n.Lookup,collect(type(r)),'out' as direction,collect(c.Lookup),collect(r)";
        
        
        relTypes += " union match (n:Class ) <-[r] - (c:Class)  where type(r)<>'EXTENDS' ";
        relTypes += "  return n.Lookup,collect(type(r)),'in' as direction,collect(c.Lookup),collect(r)";
        relTypes += " union match (n:Class ) - [:EXTENDS*] -> (d:Class) <- [r] - (c:Class)  where type(r)<>'EXTENDS' "; 
        relTypes += "  return n.Lookup,collect(type(r)),'in' as direction,collect(c.Lookup),collect(r)";
  

        //backwards - for graphql return type only
       relTypes += " union match (n:Class ) <- [:EXTENDS*] - (d:Class) - [r] -> (c:Class)  where type(r)<>'EXTENDS' "; 
        relTypes += "  return n.Lookup,collect(type(r)),'out' as direction,collect(c.Lookup),collect(r)";
       relTypes += " union match (n:Class ) <- [:EXTENDS*] - (d:Class) <- [r] - (c:Class)  where type(r)<>'EXTENDS' "; 
        relTypes += "  return n.Lookup,collect(type(r)),'in' as direction,collect(c.Lookup),collect(r)";

        return cypher.executeStatements([props,relTypes]).
            then(results => {

            let types = {};
            
            results[0].data.forEach(pd => {
                
                let type = utils.camelCase(pd.row[0]);

                if (!type.lookup) {
                    console.warn("Type without lookup (id:" + pd.row[0] + ")");
                    return;
                }

                let props = pd.row[2].map(e=>{return {name:changeCase.camelCase(e.Lookup),type:e.Type || "string"}});
                let propsMetadata = pd.row[1].map(e=>{return {required:e.Required || false}});
                type.props = _.keyBy(_.merge(props,propsMetadata),'name');

                //add id and labels
                type.props.id = {type:'string',name:'id',readonly:true};
                type.props.labels = {type:'array<string>',name:'labels'};
                type.props.lookup= {type:'string',name:'lookup',required:true};
                type.props.description= {type:'string',name:'description'};

                type.reltypes={};
                let rels = results[1].data.filter((item)=>{return type.lookup === item.row[0];});
                rels.forEach(e=>{
                    let pred = e.row[1].map(p=>{return{predicate:predicate.list[p]}});
                    let dir = _.fill(Array(pred.length),{direction:e.row[2]});
                    let cls = e.row[3].map(c=>{return{class:c}});
                    let reltypes = _.keyBy(_.merge(pred,dir,cls)
                                    ,r => r.direction==="in"? r.predicate.reverse.toLowerCase() : r.predicate.lookup.toLowerCase());
                    
                    type.reltypes = _.assignIn(type.reltypes,reltypes);
                });

                //only add if it has props - otherwise it has no use
                if (Object.keys(type.props).length){
                    
                    if (types[type.lookup]){
                        types[type.lookup] = merge(types[type.lookup],type);
                    }
                    else{
                          types[type.lookup] = type;
                    }
                  
                }
            })

            return types;
        });
        
 }

export default {
   load: () => predicate.refreshList().then(buildSchema)
}