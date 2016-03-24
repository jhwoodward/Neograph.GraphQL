module.exports = function(config){
    
    "use strict";
    
   
    var _=require("lodash");
    config = _.extend(require('./config.default'), config);
    var type = require("./type")(config);
    var predicate = require("./predicate")(config);
    var cypher = require("./cypher")(config);
    var image = require("./image")(config);
    var utils = require("./utils")(config);
    var changeCase = require("change-case");


    
    
     //Returns picture comparisons for 2 nodes 
     //(id1,id2) on 'BY'
    function getVisualComparisons(id1,id2,options) { 

        var parsed1 = utils.getMatch(id1,"n");
        var parsed2 =  utils.getMatch(id2,"m");
        var q = parsed1 + " with n " + parsed2;
        
        q += " with n,m match (n) <- [:BY] - (c1:Picture) - [r] - (c2:Picture) - [:BY] -> (m)";
        q += " with c1,c2,r match c1 - [:IMAGE] - (i1:Main:Image) ";
        q += " with c1,c2,i1,r match c2 - [:IMAGE] - (i2:Main:Image) ";
        q += " return c1,ID(c1),labels(c1),i1,c2,ID(c2),labels(c2),i2,type(r) limit 50";
        
        return cypher.executeQuery(q).then(function (data) {
            
            var out = data.map(function (val) {
                
                var item = {};
                
                var props = {
                    from: utils.camelCase(val.row[4]),
                    to: utils.camelCase(val.row[0])
                    };
                    
                if (options.format==="compact"){
                    item.from = {title:props.from.title};
                    item.to = {title:props.to.title} ;
                    item.predicate = predicate.get(val.row[8]).toString();
                }
                else{
                    item.from = _.extend(props.from,{
                            id:val.row[1],
                            labels: val.row[2]
                    });
                    item.to = _.extend(props.to,{
                            id:val.row[5],
                            labels: val.row[6]
                    });
                    item.predicate = predicate.get(val.row[8]);
                }
                
                item.from.image = image.configure(val.row[3],options);
                item.to.image = image.configure(val.row[7],options);

                return item;

            });
            
            return out;
        });
    }
    
    //Builds a relationships object from the following data structure:
    // target,ID(target),ID(rel),TYPE(rel)
    //,image,ID(image)
    //(image is optional)
    //the predicate.toString() forms the object key
    //size refers to the size of the output, can be compact or undefined
    var build = function(rels,direction,options){
        
        var defaultOptions = {format:"default"};
        options = _.extend(defaultOptions,options);
        
        var p,key,item,relationships={},itemKeys={};
        
         for (var i = 0; i < rels.length; i++) {
                    
            p = predicate.get(rels[i].row[3]);//TYPE(rel)
            if (direction){
                p.setDirection(direction);
            }
            key = p.toString();
            if (options.format==="verbose"){
                //return the full item
                 item = utils.camelCase(rels[i].row[0]);
            }
            else{
                 item = {
                    label: rels[i].row[0].Label,
                    type: rels[i].row[0].Type
                };
              
            }
           
            item.id=rels[i].row[1];
            
            //add image for picture if present
            if (rels[i].row[4]){
                item.image= image.configure(rels[i].row[4],options);
                item.image.id = rels[i].row[5];
            }
            
            let compact = item.image ? item.image.thumb : (item.label || item.id);
            
            if (!relationships[key]) {
                
                   if (options.format==="compact"){
         
                       relationships[key] = [compact];
                   }
                   else{
                           relationships[key] = {
                            predicate: p, 
                            items: [item]
                        };
                   }
            
                itemKeys[key] = [item.id];
            }
            else {
                //add if not present
                if (itemKeys[key].indexOf(item.id) === -1){
                    if (options.format==="compact"){
                            relationships[key].push(compact);
                    }
                    else{
                            relationships[key].items.push(item);
                    }
                    itemKeys[key].push(item.id);
                }
            }
        }

       // return relationships;
        
        
        //convert to array
        var arr = [];
        for (key in relationships){
            let r = relationships[key];
            r.key=key;
            arr.push(r);
        }
        return arr;
        
        
        
    };
    
    //options
    //format=compact
    var relationships = function(statements,options)
    {
        return cypher.executeStatements(statements).then(function (results) {

                var inbound,outbound = build(results[0].data,"out",options);
                if (results.length > 1 && results[1].data && results[1].data.length){
                    inbound = build(results[1].data,"in",options);
                }
                var relationships = _.extend(outbound,inbound);
                return relationships;
            });
    };

var that = {
    get:function(n){
        
    }
    ,
     //saves edge to neo (update/create)
    //TODO: according to certain rules labels will need to be maintained when relationships are created. (update not required as we always delete and recreate when changing start/end nodes)
    //tag a with label b where:
    // a=person and b=provenance (eg painter from france)
    // a=person and n=group, period (eg painter part of les fauves / roccocco)
    // a=picture and b=non-person (eg picture by corot / of tree) - although typically this will be managed through labels directly (which will then in turn has to keep relationships up to date)
    save: function (edge) {//startNode and endNode provide the full node objects for the edge
        
        //remove any empty properties
        for (var p in edge) {
            if (edge[p] === null || edge[p] === undefined || edge[p] === "") {
                delete edge[p];
            }
        }

        if (edge.id) //update
        {
            that.update(edge);
        }
        else //new
        {
            that.insert(edge);
        }
    }
    ,
    update:function(edge){
      
        let statements = [];
        statements.push(cypher.buildStatement("match (a)-[r]->(b) where ID(a) = " + edge.start.id + " and ID(b)=" + edge.end.id + " and ID(r)=" + edge.id + " delete r"));
        statements.push(cypher.buildStatement("match(a),(b) where ID(a)=" + edge.start.id + " and ID(b) = " + edge.end.id + " create (a)-[r:" + edge.type + " {props}]->(b) return r"
                                , "graph"
                                , { "props": edge.properties }));

        return cypher.executeStatements(statements)
                .then(function (results) {
            return graph.build(results[0].data);
        });
    }
    ,
    insert:function(edge){
      
        var aIsPerson = edge.start.labels.indexOf("Person") > -1;
        var bIsProvenance = edge.end.labels.indexOf("Provenance") > -1;
        var bIsGroup = edge.end.labels.indexOf("Group") > -1;
        var bIsPeriod = edge.end.labels.indexOf("Period") > -1;
        
        var tagAwithB = ((aIsPerson && (bIsProvenance || bIsGroup || bIsPeriod)) && edge.type != "INFLUENCES") || edge.type === "TYPE_OF";
        
        let statements = [];
        
        if (tagAwithB) {
            statements.push(cypher.buildStatement("match(a) where ID(a)=" + edge.start.id + " set a:" + edge.end.Lookup));
        }
        
        statements.push(cypher.buildStatement("match(a),(b) where ID(a)=" + edge.start.id + " and ID(b) = " + edge.end.id + " create (a)-[r:" + edge.type + " {props}]->(b) return r"
                , "graph"
                , { "props": edge.properties }));
            
        return cypher.executeStatements(statements)
                .then(function (results) {
                    var out = graph.build(results[statements.length - 1].data);
                    return out;
        });
            
    }
    ,
    delete: function (edge) {

        if (edge && edge.id) {
            
            var statements = [];
            
            //remove label that may be in place due to relationship
            statements.push(cypher.buildStatement("match (a) where ID(a) = " + edge.start.id + " remove a:" + edge.end.label));
            statements.push(cypher.buildStatement("match (a)-[r]->(b) where ID(r)=" + edge.id + " delete r"));
            return cypher.executeStatements(statements);

        }

    }
    ,
createStatement(n,predicate,e){
    
    if (e.id===undefined || e.id < 0)
    {
        throw ("Cannot create relationship with item that has no id");
    }
     if (n.id===undefined || e.id < 0)
    {
        throw ("Cannot create relationship for item without id");
    }
        
    var relType = predicate.lookup.toUpperCase();
    var q;
    if (predicate.direction === "out") {
        q = "match n,m where ID(n)=" + n.id + " and ID(m)=" + e.id;
        q += "  create (n) - [:" + relType + "] -> (m)";
    }
    else if (predicate.direction === "in")  {
        q = "match n,m where ID(n)=" + n.id + " and ID(m)=" + e.id;
        q += "  create (n) <- [:" + relType + "] - (m)";
    }
    else{
        throw("Invalid predicate direction: " + predicate.direction);
    }
    return cypher.buildStatement(q);
}
              ,
 removeStatement:function(n,predicate,e){
    var relType = predicate.lookup.toUpperCase();
    var q;
    if (predicate.direction === "out") {
        q = "match (n) - [r:" + relType + "] -> (m)";
        q += " where ID(n)=" + n.id + " and ID(m)=" + e.id + "  delete r";
    }
    else if (predicate.direction === "in")  {
        q = "match (n) <- [r:" + relType + "] - (m)";
        q += " where ID(n)=" + n.id + " and ID(m)=" + e.id + "  delete r";
    }
    else{
        throw("Invalid predicate direction: " + predicate.direction);
    }
     return cypher.buildStatement(q);
}
,
//returns an array of relationship differences between the passed in node 
//and its saved version
//each item in the array is formed
//{
//  "predicate":{"lookup":"LIKES",direction:"out"}
//  ,add:[{id:123},{id:456}],remove:[{id:789},{id:543}]}
//}
difference:function(n){
    
    return that.list.conceptual(n).then(function(existingRelationships){
        
        var diff = [];
        
        for (let key in n.relationships) {
            //key is the predicate.toString() which includes direction (influenced / influenced by)
            let newRel = n.relationships[key];
            if (!_.isArray(newRel.items)){ 
                throw("Relationship items must be an array");
            }
            
            let existingRel = existingRelationships ? existingRelationships[key]:null;
            if (!existingRel) {
                let changed = {predicate:newRel.predicate,add:newRel.items,remove:[]};
                diff.push(changed);
            }
            else {
                 let itemsToRemove=utils.difference(existingRel.items,newRel.items);
                 let itemsToAdd=utils.difference(newRel.items,existingRel.items);
                  if (itemsToAdd.length || itemsToRemove.length){
                    let changed = {predicate:newRel.predicate,add:itemsToAdd,remove:itemsToRemove};
                    diff.push(changed);
                }
            }
        }
        
        for (let key in existingRelationships) {
            let newRel = n.relationships ? n.relationships[key]:null;
            let existingRel = existingRelationships[key];
            if (!newRel) {     //relationship not present in node so remove it from DB
                let changed = {predicate:existingRel.predicate,remove:existingRel.items,add:[]};
                diff.push(changed);
            }
        }
        
        return diff;

    });
}
    ,
    saveLinks:function(){
        
        

                /*
                //insert links
                if (n.temp && n.temp.links){
                    for (let i = 0; i < n.temp.links.length; i++) {
                        let e = n.temp.links[i];
                        if (e.editing) {
                            delete e.editing;
                        }
                        e.Type = "Link";
                        statements.push(cypher.buildStatement("create (l:Link {props}) with l MATCH (n) where ID(n)=" + n.id + " create (n) - [r:LINK] -> (l) ", "row", { props: utils.pascalCase(e) }));
                    }
                }
                
                
                
                
                     //update links (???)
                        if (n.temp && n.temp.links){
                             statements.push(cypher.buildStatement("MATCH (n)- [r:LINK] -> (l:Link) where ID(n)=" + n.id + "  delete r,l ", "row"));
                        for (let i = 0; i < n.temp.links.length; i++) {
                            let e = n.temp.links[i];
                            if (e.editing) {
                                delete e.editing;
                            }
                            e.Type = "Link";
                            statements.push(cypher.buildStatement("create (l:Link:" + n.Label  + "  {props}) with l MATCH (n) where ID(n)=" + n.id + " create (n) - [r:LINK] -> (l) ", "row", { props: e }));
                        }
                    
                        }
                */
    }
    ,
    list:{
        //web links
        web:function(id){
        var q = utils.getMatch(id) + "  with n match (n) - [r:LINK] - (m:Link)     return ID(m), m.Name,m.Url";
        return cypher.executeQuery(q).then(function(links){
            var weblinks = [];
                for (i = 0; i < links.length; i++) {
                    weblinks.links.push({
                        name: links[i].row[1], 
                        url: links[i].row[2]
                    });
                }
            return weblinks;
        });
        }
        ,
        //All relationships
        //NB will return all pictures by an artist or in a category 
        //Used by picture.getwithrels
        all:function(id,options){
            var match = utils.getMatch(id);
            var statements = [];
            //out 
            statements.push(cypher.buildStatement(match + " with n match (n) - [r] -> (m)  return m,ID(m), ID(r),TYPE(r)", "row"));
            //in
            statements.push(cypher.buildStatement(match + " with n match (n) <- [r] - (m)  return n,ID(m),ID(r),TYPE(r)", "row"));
            return relationships(statements,options);
        }
        ,
        //Relationships with 'Label' (non picture) nodes
        //Aggregated by [predicate + direction ('->' or '-<')] which form the object keys
        //options.format is compact,default
        conceptual: function (id,options) {

            var match = utils.getMatch(id);
            var statements = [];
            //out 
            statements.push(cypher.buildStatement(match + " with n match (n) - [r] -> (m:Label)  return m,ID(m),ID(r),TYPE(r)", "row"));
            //in
            statements.push(cypher.buildStatement(match + " with n match (n) <- [r] - (m:Label)  where  NOT(n <-[:BY]-(m))    return m,ID(m),ID(r),TYPE(r)", "row"));
            return relationships(statements,options);
    }
       ,
        //Relationships with 'Property'  nodes
       //format is default
        property: function (id) {

            var match = utils.getMatch(id);
            var statements = [];
            //out only
            statements.push(cypher.buildStatement(match + " with n match (n) - [r:PROPERTY] -> (m:Property)  return m,ID(m),ID(r),TYPE(r)", "row"));
            return relationships(statements,{format:"verbose"});
    }
        ,
        //Relationships with 'Picture' nodes
        //Can be used 
        //-- to get pictures related to an conceptual entity (eg paintings by an artist)
        //-- to get pictures related to a picture
        //-- if 2 ids are passed
        //------picture comparisons between the 2 nodes are returned
        visual:function(id1,id2,options){
            
            if (id1 && id2){
                return getVisualComparisons(id1,id2,options);
            }
            else{
                var match = utils.getMatch(id1);
                var statements = [];
                //out 
                statements.push(cypher.buildStatement(match + " with n match (n) - [r] -> (m:Picture) - [:IMAGE] -> (i:Image:Main)  return m,ID(m),ID(r),TYPE(r),i,ID(i),LABELS(i)", "row"));
                //in
                statements.push(cypher.buildStatement(match + " with n match (n) <- [r] - (m:Picture)- [:IMAGE] -> (i:Image:Main)  return m,ID(m), ID(r),TYPE(r),i,ID(i),LABELS(i)", "row"));
                return relationships(statements,options);
            }
           
        }
        ,
        // relationships with creators
        // inferred from relationships between their creations
        // they may or may not have an explicit relationship defined
        inferred:function(id,options){
            var q = utils.getMatch(id);

            q += " with n match (n) <- [:BY] - (c1:Picture) - [] - (c2:Picture) - [:BY] -> (m)";
            q += " return m,ID(m),-1,'inferred',m.Label";
            
            return cypher.executeQuery(q).then(function(data){
                return build(data,options);
            });
        }
   
     
    }

};


return that;


    
    
};

