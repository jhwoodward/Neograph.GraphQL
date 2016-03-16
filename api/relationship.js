module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var type = require("./type")(config);
    var predicate = require("./predicate")(config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var node = require("./node");
    var changeCase = require("change-case");


    var _=require("lodash");
    
    
     //get picture comparisons for 2 nodes (edge.startNode, edge.edgeNode) on 'BY'
    function getVisualComparisons(id1,id2) { //loks up id/label first then call get by label

        var parsed1 = utils.getMatch(id1,"n");
        var parsed2 =  utils.getMatch(id2,"m");
        var q = parsed1 + " with n " + parsed2;
        
        q += " with n,m match (n) <- [:BY] - (c1:Picture) - [r] - (c2:Picture) - [:BY] -> (m)";
        q+= " with c1,c2,r match c1 - [:IMAGE] - (i1:Main:Image) ";
        q+= " with c1,c2,i1,r match c2 - [:IMAGE] - (i2:Main:Image) ";
        q+= " return c1,ID(c1),labels(c1),i1,c2,ID(c2),labels(c2),i2,type(r) limit 50";
        
        return cypher.executeQuery(q).then(function (data) {
            
            var out = data.map(function (val) {
                
                var from = utils.camelCase(val.row[0]);
                from.id=val.row[1];
                from.labels = val.row[2];
                from.image = image.configure(val.row[3]);

                var to = utils.camelCase(val.row[4]);
                to.id=val.row[5];
                to.labels = val.row[6];
                to.image = image.configure(val.row[7]);

                return {
                    from: from,
                    predicate:predicate.get(val.row[8]),
                    to: to
                };

            });
            
            return out;
        });
    }
    
    //Builds a relationships object from the following data structure:
    //ID(target), target.Lookup,target.Type,ID(rel),TYPE(rel),target.Label
    //,image,ID(image)
    //(image is optional)
    //the predicate.toString() forms the object key
    var build = function(rels,direction){
        
        var p,key,item,relationships={},itemKeys={};
        
         for (var i = 0; i < rels.length; i++) {
                    
            p = predicate.get(rels[i].row[4]);
            if (direction){
                p.setDirection(direction);
            }
            key = p.toString();
            item = {
                id: rels[i].row[0],
                lookup: rels[i].row[1],
                type: rels[i].row[2],
                label: rels[i].row[5]
            };
            
            //add image for picture if present
            if (rels[i].row[6]){
                item.image= image.configure(rels[i].row[6]);
                item.image.id = rels[i].row[7];
            }
            
            if (!relationships[key]) {
                relationships[key] = {
                    predicate: p, 
                    items: [item]
                };
                itemKeys[key] = [item.id];
            }
            else {
                //add if not present
                if (itemKeys[key].indexOf(item.id) === -1){
                    relationships[key].items.push(item);
                    itemKeys[key].push(item.id);
                }
            }
        }

        return relationships;
    };
    
    
    var relationships = function(statements)
    {
        return cypher.executeStatements(statements).then(function (results) {

                var relationships = {};

                var outbound = build(results[0].data,"out");
                var inbound = build(results[1].data,"in");

                return _.extend(outbound,inbound);
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
            //     console.log(statements);
            return cypher.executeStatements(statements);

        }

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
        //Create relationships for node n
        //requires presence of n.relationships
        create:function(n){

            var statements = [];
            
            for (let prop in n.relationships) {
                let rel = n.relationships[prop];
                if (rel.predicate.direction === "out") {
                    for (let i = 0; i < rel.items.length; i++) {
                        let e = rel.items[i];
                        statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.lookup + "] -> (m)"));
                    }
                }
                else if (rel.predicate.direction === "in") {
                    for (let i = 0; i < rel.items.length; i++) {
                        let e = rel.items[i];
                        statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.lookup + "] -> (n)"));
                    }
                }
                else{
                    throw ("Invalid predicate direction: " + rel.predicate.direction);
                }
            }

            return cypher.executeStatements(statements).then(function(){
                return node.getWithRels(n);
            });
            
        }
        ,
        update:function(n)
        {
              
            var statements = [];
            
                //check passed in node against saved node for differences
            return node.getWithRels(n)
            .then(function(existing){
                
                for (let rel in n.relationships) {
                    let rel = n.relationships[rel];
                    let existingRel = existing.relationships[rel];
                    if (!existingRel) {
                        rel.itemsToRemove = [];
                        rel.itemsToAdd = rel.items;
                    }
                    else {
                        var existingRelIds = existingRel.map(function (e) { return e.id; });
                        var newRelIds = rel.items.map(function (e) { return e.id; });
                        rel.itemsToRemove = _.difference(existingRelIds,newRelIds).map(function (e) { return { id: e }; });
                        rel.itemsToAdd = _.difference(newRelIds,existingRelIds).map(function (e) { return { id: e }; });
                    }
                    
                    for (let i = 0; i < rel.itemsToAdd.length; i++) {
                        let e = rel.itemsToAdd[i];
                        if (rel.predicate.direction === "out") {
                            statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.lookup + "] -> (m)"));
                        }
                        else if (rel.predicate.direction === "in")  {
                            statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.lookup + "] -> (n)"));
                        }
                        else{
                            throw("Invalid predicate direction: " + rel.predicate.direction);
                        }
                    }
                    
                    for (let i = 0; i < rel.itemsToRemove.length; i++) {
                        let e = rel.itemsToRemove[i];
                        if (rel.predicate.direction === "out") {
                            statements.push(cypher.buildStatement("match (n) - [r:" + rel.predicate.lookup + "] -> (m) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                        }
                        else if (rel.predicate.direction === "in")  {
                            statements.push(cypher.buildStatement("match (m) - [r:" + rel.predicate.lookup + "] -> (n) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                        }
                        else{
                            throw("Invalid predicate direction: " + rel.predicate.direction);
                        }
                    }
                }
                
                for (let rel in existing.relationships) {
                    let rel = n.relationships[rel];
                    let existingRel = existing.relationships[rel];
                    if (!rel) {
                        for (var i = 0; i < existingRel.items.length; i++) {
                            var e = existingRel.items[i];
                            if (existingRel.predicate.direction === "out") {
                                statements.push(cypher.buildStatement("match (n) - [r:" + existingRel.predicate.lookup + "] -> (m) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                            }
                            else if (existingRel.predicate.direction === "in") {
                                statements.push(cypher.buildStatement("match (m) - [r:" + existingRel.predicate.lookup + "] -> (n) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                            }
                            else{
                                throw("Invalid predicate direction: " + existingRel.predicate.direction);
                            }
                        }
                    }
                }
                
                if (statements.length){
                    return cypher.executeStatements(statements).then(function(){
                        return node.getWithRels(n);
                    });
                }
                else{
                    return existing;
                }
                
                
                
            });
        }
        ,
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
        all:function(id){
            var match = utils.getMatch(id);
            var statements = [];
            //out 
            statements.push(cypher.buildStatement(match + " with n match (n) - [r] -> (m)  return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label", "row"));
            //in
            statements.push(cypher.buildStatement(match + " with n match (n) <- [r] - (m)  return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label", "row"));
            return relationships(statements);
        }
        ,
        //Relationships with 'Label' (non picture) nodes
        //Aggregated by [predicate + direction ('->' or '-<')] which form the object keys
        conceptual: function (id) {

            var match = utils.getMatch(id);
            var statements = [];
            //out 
            statements.push(cypher.buildStatement(match + " with n match (n) - [r] -> (m:Label)  return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label", "row"));
            //in
            statements.push(cypher.buildStatement(match + " with n match (n) <- [r] - (m:Label)  where  NOT(n <-[:BY]-(m))    return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label", "row"));
            return relationships(statements);
    }
        ,
        //Relationships with 'Picture' nodes
        //Can be used 
        //-- to get pictures related to an conceptual entity (eg paintings by an artist)
        //-- to get pictures related to a picture
        //-- if 2 ids are passed
        //------picture comparisons between the 2 nodes are returned
        visual:function(id1,id2){
            
            if (id1 && id2){
                return getVisualComparisons(id1,id2);
            }
            else{
                var match = utils.getMatch(id1);
                var statements = [];
                //out 
                statements.push(cypher.buildStatement(match + " with n match (n) - [r] -> (m:Picture) - [:IMAGE] -> (i:Image:Main)  return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label,i,ID(i),LABELS(i)", "row"));
                //in
                statements.push(cypher.buildStatement(match + " with n match (n) <- [r] - (m:Picture)- [:IMAGE] -> (i:Image:Main)  return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label,i,ID(i),LABELS(i)", "row"));
                return relationships(statements);
            }
           
        }
        ,
        // relationships with creators
        // inferred from relationships between their creations
        // they may or may not have an explicit relationship defined
        inferred:function(id){
            var q = utils.getMatch(id);

            q += " with n match (n) <- [:BY] - (c1:Picture) - [] - (c2:Picture) - [:BY] -> (m)";
            q += " return ID(m), m.Lookup,m.Type,-1,'inferred',m.Label";
            
            return cypher.executeQuery(q).then(function(data){
                return build(data);
            });
        }
     
    }

};


return that;


    
    
};

