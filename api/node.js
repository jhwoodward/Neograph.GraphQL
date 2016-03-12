module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var nodeUtils = require("./node.utils")(config);
    var utils = require("./utils")(config);
    var type = require("./type");
    var cypher = require("./cypher")(config);
    var graph = require("./graph")(config);
    var changeCase = require("change-case");
    var _ = require("lodash");



var getNode = function (match, where) {
    
    return cypher.executeQuery("match (" + match + ") where " + where + " return ID(n),n,LABELS(n) ", "row").then(function (data) {
        if (data.length) {

            var n = utils.camelCase(data[0].row[1]);
            n.id = data[0].row[0];
            n.labels = data[0].row[2].sort();
            return nodeUtils.addProps(n);
        }
        else {
            return null;
        }
    });
};


var getImages = function (n) {
    
    var statements = [];
    //pictures  / images
    if (n.temp.isPicture) { //if picture return images (these are other - usually less good - images of the same picture)
        statements.push(cypher.buildStatement("match (n) - [r] - (m:Image)  where ID(n) = " + n.id + "  return ID(m), m,type(r) order by m.Status DESC limit 50 ", "graph"));
    }
    else if (n.temp.isGroup) {//todo:also return images linked /tagged directly
        statements.push(cypher.buildStatement("MATCH (p:Label) - [:ASSOCIATED_WITH|:PART_OF|:FOUNDS|:LEADS|:MEMBER_OF|:REPRESENTS] - (g:Group), (p) -- (i:Picture) where ID(g) = " + n.id + " return p.Name,collect(i)[0..5],count(*) as count order by p.Name", "graph"));
    }
    else {
        statements.push(cypher.buildStatement("match (n) - [r] - (m:Picture)  where ID(n) = " + n.id + "  return ID(m), m,type(r) order by m.Status DESC limit 50 ", "graph"));
    }
    
    return cypher.executeStatements(statements)
        .then(function (results) {
            return graph.build(results[0].data, true).nodes;
        });

};

var that = {
 
   
  

    //,
    ////returns all relationships between supplied nodes, which can be vis.Dataset or graph data object
    //getAllRelationships: function (nodes) {
    //    var nodeIds = "";
    
    //    if (nodes.getIds) //if vis.DataSet
    //    {
    //        nodeIds = nodes.getIds({ returnType: 'Array' }).join(",");
    //    }
    //    else { //otherwise data object
    
    //        for (var key in nodes) {
    //            if (nodeIds.length) {
    //                nodeIds += ",";
    //            }
    //            nodeIds += key;
    //        }
    //    }
    
    //    var q = "MATCH a -[r]- b WHERE id(a) IN[" + nodeIds + "] and id(b) IN[" + nodeIds + "] and not (a-[:TYPE_OF]-b) return r";
    
    //    return neoClient.graph.get({ q: q });//graph.get(q);
    
    //}
    
    //get node 
    //by (internal)ID
    get: function (id) {
        
        //handle possibility of node object being passed in
        //instead of just the id
        if (id.id){
            id = id.id;
        }
        
        return getNode("n", " ID(n)=" + id);
    }
    
    ,
    //get node and add 'virtual' properties
    //by (internal ID)
    //- properties as defined by label (that may be empty)
    //- relationships as properties (relProps), 
    getWithRels: function (id) {
        return that.get(id).then(function (data) {
            return nodeUtils.addRelProps(data).then(function (out) {
                out = nodeUtils.setPropsAndTabsFromLabels(out);
                return nodeUtils.addLabelled(out);
            });
        });
    }
    ,
    //get node 
    //by label property (n.Label)
    //--is uniqueness enforced ?
    getByLabel: function (label) {
        return getNode("n:Label", "n.Label = '" + label + "'");
    }
    ,
    getWithRelsByLabel: function (label) {
        
        return that.getByLabel(label)
            .then(function (data) {
            
                if (data) {
                    return nodeUtils.addRelProps(data).then(function (out) {
                        out = nodeUtils.setPropsAndTabsFromLabels(out);
                        return nodeUtils.addLabelled(out);
                    });
                }
                else return null;
        });
    }
    ,
    //TODO: 
    //for labels (types), type hierachy needs to be enforced - eg if Painter then add Person:Global,-----------------DONE
    //if Painting the add Picture:Creation. These will need to be kept updated.
    //when Lookup is updated, the corresponding label needs to be renamed MATCH (n:OLD_LABEL)  REMOVE n:OLD_LABEL SET n:NEW_LABEL--------------- DONE
    //when updating Type, label needs to be updated, when creating----------------------DONE
    //When we come to modifying labels on creations, their relationships will need to be kept updated
    save: function (n,user) {
        
        //prevent save if trimmed flag is set as this would cause data loss
        if (n.temp && n.temp.trimmed) {
            throw "Node is trimmed - cannot save";
        }

        if (n.id > -1) { //update
           return that.update(n,user);
        }
        else {
           return that.insert(n,user);
        }
    }
    ,
    //n can be an object with any properties
    //the following properties have special meaning:
    //--id: must not be > -1 as this indicates an existing node
    //--labels: an array of strings. The node will be saved with these neo4j labels. Required.
    //--temp.relProps: relationships defined as properties. Not Required.
    //--temp.links: links .. ??? Not Required
    //user is an optional parameter
    //--if supplied and user exists a 'created' relationship is added
    //Following save each relProp is created as a neo4j relationship
    insert:function(n,user)
    {
      
       if (n.id >-1) throw ("Node must have ID < 0 for insert");
       if (!(n.labels instanceof Array)) throw ("Node must have labels array property");

        var props = nodeUtils.propsForSave(n);
        
        nodeUtils.setLabelParents(n);
        var q = "create (n:" + n.labels.join(":") + " {props}) with n set n.created=timestamp() ";

        //if user passed as second argument create a link to the user from this node
        if (user) {
            q += " with n  MATCH (u:User {Lookup:'" + user.Lookup + "'})  create (u) - [s:CREATED]->(n)";
        }
        q += " return ID(n),n,LABELS(n)  ";
        return cypher.executeQuery(q, "row", { "props": props })
            .then(function (data) {

                let saved = utils.camelCase(data[0].row[1]);
                saved.id = data[0].row[0];
                saved.labels = data[0].row[2];

                let statements = [];
                //create relationships from n.temp.relProps
                if (n.temp && n.temp.relProps){
                  
                    for (let prop in n.temp.relProps) {
                        let rel = n.temp.relProps[prop];
                        
                        if (rel.predicate.Direction === "out") {
                            
                            for (let i = 0; i < rel.items.length; i++) {
                                let e = rel.items[i];
                                statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.Lookup + "] -> (m)"));
                            }
                        }
                        else {
                            for (let i = 0; i < rel.items.length; i++) {
                                let e = rel.items[i];
                                statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.Lookup + "] -> (n)"));
                            }
                        }
                    }
                }
              

                //create links from n.temp.links
                //What are links ???
                if (n.temp && n.temp.links){
                    for (let i = 0; i < n.temp.links.length; i++) {
                        let e = n.temp.links[i];
                        if (e.editing) {
                            delete e.editing;
                        }
                        e.Type = "Link";
                        statements.push(cypher.buildStatement("create (l:Link {props}) with l MATCH (n) where ID(n)=" + n.id + " create (n) - [r:LINK] -> (l) ", "row", { props: e }));
                    }
                }
             

                if (statements.length) {
                    return cypher.executeStatements(statements).then(function (results) {
                        //add properties to the node
                        let out = nodeUtils.addProps(saved);
                        return nodeUtils.addRelProps(out);
                    });
                }
                else {
                    return nodeUtils.addProps(saved);
                }
            });
    }
    ,
    update:function(n,user){

        if (n.id <=-1) throw ("Node must have ID >=0 for update");

        var props = nodeUtils.propsForSave(n);
        
          var arrLabelsToRemove
                ,arrLabelsToAdd
                ,arrLabelledToRemove
                ,arrLabelledToAdd
                ,statements = [];
            
            
            //check existing node
            return that.getWithRels(n.id)
                .then(function (existing) {
                
                    nodeUtils.setLabelParents(n);
                    
                    arrLabelsToRemove = _.difference(existing.labels,n.labels);//The array to inspect, The values to exclude.
                    arrLabelsToAdd = _.difference(n.labels,existing.labels);
                    
                    if (arrLabelsToAdd.length || arrLabelsToRemove.length) {
                        var sAddLabels = "";
                        if (arrLabelsToAdd.length) {
                            sAddLabels = " set n:" + arrLabelsToAdd.join(":");
                        }
                        
                        var sRemoveLabels = "";
                        if (arrLabelsToRemove.length) {
                            sRemoveLabels = " remove n:" + arrLabelsToRemove.join(":");
                        }
                        statements.push({ statement: "match(n) where ID(n)=" + n.id + sRemoveLabels + sAddLabels });
                    }
                
                    //update item labels if changing Label property
                    if (existing.Label && existing.Label != n.Label) {
                        statements.push({ statement: "match(n:" + existing.Label + ") remove n:" + existing.Label + " set n:" + n.Label });
                    }
                
                    statements.push(cypher.buildStatement("match(n) where ID(n)=" + n.id + "  set n= {props} return ID(n),n,LABELS(n) ", "row", { "props": props }));
                
                
                    //update labelled
                    //can only do this if < 50 items labelled or request gets too large
                    if (n.temp && n.temp.labelled && !n.temp.labelledOverflow) {
                        var arrLabelled = n.temp.labelled.map(function (i) { return i.id; });
                        var arrExistingLabelled = existing.temp.labelled.map(function (i) { return i.id; });
                        arrLabelledToRemove = _.difference(arrExistingLabelled,arrLabelled);
                        arrLabelledToAdd = _.difference(arrLabelled,arrExistingLabelled);
                        if (arrLabelledToAdd.length) {
                            statements.push({ statement: "match(n:Label) where ID(n) in [" + arrLabelledToAdd.join(",") + "] set n:" + props.Label });
                        }
                        if (arrLabelledToRemove.length) {
                            statements.push({ statement: "match(n:Label) where ID(n) in [" + arrLabelledToRemove.join(",") + "] remove n:" + props.Label });
                        }
                    }
                
                return cypher.executeStatements(statements)
                    .then(function (results) {
                        
                        var nodeData = results[statements.length - 1].data[0].row;
                        var saved = utils.camelCase(nodeData[1]);
                        saved.id = nodeData[0];
                        saved.labels = nodeData[2];
                        
                        
                        statements = [];
                        
                        for (let relProp in n.temp.relProps) {
                            let rel = n.temp.relProps[relProp];
                            let existingRel = existing.temp.relProps[relProp];
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
                                if (rel.predicate.Direction === "out") {
                                    statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.Lookup + "] -> (m)"));
                                }
                                else {
                                    statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.Lookup + "] -> (n)"));
                                }
                            }
                            
                            for (let i = 0; i < rel.itemsToRemove.length; i++) {
                                let e = rel.itemsToRemove[i];
                                if (rel.predicate.Direction === "out") {
                                    statements.push(cypher.buildStatement("match (n) - [r:" + rel.predicate.Lookup + "] -> (m) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                                }
                                else {
                                    statements.push(cypher.buildStatement("match (m) - [r:" + rel.predicate.Lookup + "] -> (n) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                                }
                            }
                        }
                        
                        for (let relProp in existing.temp.relProps) {
                            let rel = n.temp.relProps[relProp];
                            let existingRel = existing.temp.relProps[relProp];
                            if (!rel) {
                                for (var i = 0; i < existingRel.items.length; i++) {
                                    var e = existingRel.items[i];
                                    if (existingRel.predicate.Direction === "out") {
                                        statements.push(cypher.buildStatement("match (n) - [r:" + existingRel.predicate.Lookup + "] -> (m) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                                    }
                                    else {
                                        statements.push(cypher.buildStatement("match (m) - [r:" + existingRel.predicate.Lookup + "] -> (n) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                                    }
                                }
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
                   
                    
                    
                        if (statements.length) {
                            
                            return cypher.executeStatements(statements).then(function (results) {
                                var out = extend(true, n, nodeUtils.addProps(saved));//might be more convincing to reload the relationships instead of merging existing object
                                return out;
                            });

                        }
                        else {
                            return extend(true, n, nodeUtils.addProps(saved));//might be more convincing to reload the relationships instead of merging existing object
                        }

                });
            });
        
    }
    ,
    destroy: function (node) {//deletes node and relationships forever

        var q = "match (n) where ID(n)=" + node.id + "  OPTIONAL MATCH (n)-[r]-()  delete n,r";
        return cypher.executeQuery(q);
    }
    ,
    //--removes labels and adds label Deleted
    //--sets property deleted = timestamp
    //--stores labels in labels property
    //--relationships are left intact
    delete: function (node) {

        if (!node || !node.id){
            throw "node not supplied";
        }

        var statements = [];

        //remove existing labels and add deleted label
        statements.push(cypher.buildStatement("match(n)  where ID(n)=" + node.id + "  remove n:" + node.labels.join(':') + " set n:Deleted,n.oldlabels={labels},n.deleted=timestamp()  return ID(n),n,LABELS(n)", "row", { "labels": node.labels }, true));

        return cypher.executeStatements(statements).then(function (results) {
            var nodeData = results[0].data[0].row;
            var deleted = nodeData[1];
            deleted.id = nodeData[0];
            deleted.labels = nodeData[2];
            return nodeUtils.addProps(deleted);
        });
    }
    ,
    restore: function (node) {

        if (!node || !node.id){
            throw "node not supplied";
        }

        //only supports 1 node at the mo
        var statements = [];

        //remove existing labels and add deleted label
        //  statements.push(cypher.buildStatement("match(n)  where ID(n)=" + node.id + "  remove n:" + node.labels.join(':') + " set n:Deleted,n.labels={labels},n.relationships={rels},n.deleted=timestamp()", "row", { "rels": rels, "labels": node.labels }, true));
        
        statements.push(cypher.buildStatement("match(n)  where ID(n)=" + node.id + "  set n:" + node.oldlabels.join(':') + " remove n:Deleted,n.oldlabels,n.deleted return ID(n),n,LABELS(n) ", "row", null, true));

        return cypher.executeStatements(statements).then(function (results) {
            
            var nodeData = results[0].data[0].row;
            var saved = utils.camelCase(nodeData[1]);
            saved.id = nodeData[0];
            saved.labels = nodeData[2].sort();
            return nodeUtils.addProps(saved);
        });
    }
    ,
    //get all relationships with other :Global nodes
    //by (internal)ID
    //should this be in graph module ??
    getRelationships: function (id) {

        var q = "match (n)-[r]-(m:Global) where ID(n)=" + id + " return r";
        return graph.get(q);
    }
    ,
     getImages : function (n) {

        //nb these properties are in the temp object when sent out
        if (n.temp === undefined || (n.temp.isPicture === undefined || n.temp.isGroup === undefined)) {
            
            return that.get(n.id).then(function (nLoaded) {
                return getImages(nLoaded);
            });
        }
        else {
            return getImages(n);
        }
    }
,
    getImageRelationships: function (edge) { //loks up id/label first then call get by label

        //TODO: NEEDS UPDATING SINCE CHANGE FROM IMAGEPATH TO IMAGEURL
        var q = "match (n) - [r] - (c1) - [r2] - (c2) - [r3] - (m) where (c1:Painting or c1:Drawing) and (c2:Painting or c2:Drawing)  and ID(n) = " + edge.startNode + " and ID(m) = " + edge.endNode + "  return c1,labels(c1),c2,labels(c2) limit 50";//type(r)
        
        return cypher.executeQuery(q).then(function (data) {
            
            var out = data.map(function (val) {
                
                var from = val.row[0];
                from.temp = {
                 //   thumbUrl: getThumbnailUrl(from.ImagePath)
                };
                
                from.labels = val.row[1];
                
                var to = val.row[2];
                to.temp = {
                 //   thumbUrl: getThumbnailUrl(to.ImagePath)
                };
                
                to.labels = val.row[3];
                
                return {
                    from: from,
                    to: to
                };

            });
            
            return out;
        });
    }
    ,
    //returns a single node using the supplied query
    //q must be a match that returns a single entity n
    single: function (q) {
        q = q + " return ID(n),n.Lookup";
        return cypher.executeQuery(q, "row").then(function (data) {
            var out = data.map(function (d) {
                return {
                    id: d.row[0],
                    lookup: d.row[1]
                };

            })[0];
            return out;
        });
    }
      ,
    //options.q can be any cypher query with node specified as n
    //options.limit limit the number of items returned
    list: function (options) {

        options.q += "  return ID(n),n,LABELS(n) ";
        if (options.limit) {
            options.q += " limit " + options.limit;
        }
        
        return cypher.executeQuery(options.q, "row")
            .then(function (data) {
                var out = data.map(function (item) {
                    var n = utils.camelCase(data[0].row[1]);
                    n.id = data[0].row[0];
                    n.labels = data[0].row[2];
                    return nodeUtils.addProps(n);
                });
                return out;
            });
    }
};


return that;
 
};

