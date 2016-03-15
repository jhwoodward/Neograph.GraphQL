module.exports = function(config){
    
    "use strict";
    
  
    var _ = require("lodash");
    config = _.extend(require('./config.default'), config);
    var nodeUtils = require("./node.utils")(config);
    var utils = require("./utils")(config);
    var type = require("./type")(config);
    var cypher = require("./cypher")(config);
    var graph = require("./graph")(config);
    var relationship = require("./relationship")(config);
    var changeCase = require("change-case");
  



var getNode = function (match, where) {
    
    return cypher.executeQuery("match(" + match + ")  where " + where + " with n optional match (" + match + ") -[:IMAGE] - (i:Image:Main) return ID(n),n,LABELS(n),i ", "row")
    .then(function (data) {
        if (data.length) {

            var n = utils.camelCase(data[0].row[1]);
            n.id = data[0].row[0];
            n.labels = data[0].row[2];
            if (n.labels) n.labels.sort();
            if (data[0].row[3]){
                n.image = utils.camelCase(data[0].row[3]);
            }
            nodeUtils.configureImage(n.image);
            addSchema(n);

            return n;
        }
        else {
            return null;
        }
    });
};

var getNodeById= function (id) {
    return getNode("n", "ID(n) = " + id );
};

var getNodeByLabel= function (label) {
    return getNode("n:Label", "n.Label = '" + label + "'");
};

var addRelationships = function (n) {
    if (n){
        return relationship.list.conceptual(n)
        .then(function(r){
            n.relationships=r;
            //didn't ask for this so shouldn't strictly do it
            return that.list.labelled(n.label,50).then(function(labelled){
                n.labelled= labelled;
                return n;
            });
        });
    }
    else{
        return null;
    }
};

//Returns an object containing properties defined by types in labels
//Requires n.labels
var getSchema = function (n) {
    var schema = {};
        for (let i = 0; i < n.labels.length; i++) {
            let label = n.labels[i];
            if (!type.list[label]) continue;
            var t = type.list[label];//retrieve the type from the label text
            if (t.Props) {
                var arrProps = t.Props.split(',');
                for (let j = 0; j < arrProps.length; j++) {
                    var prop = changeCase.camelCase(arrProps[j]);
                    schema[prop] = "";
                }
            }
        }
        return schema;
    };


var addSchema = function(n){
        return _.extend(getSchema(n),n);
    };

var that = {
    //get node by (internal)ID or label
    get: function (id) {
        var parsed = utils.parseIdOrLabel(id);
        if (parsed.id){
             return getNodeById(parsed.id);
        }
        if (parsed.label){
             return getNodeByLabel(parsed.label) ;
        }
 
    }
    
    ,
    //Get node by (internal ID) or label
    //Add relationships
    getWithRels: function (id) {
        
        var parsed = utils.parseIdOrLabel(id);
        
        if (parsed.id){
            return getNodeById(parsed.id)
            .then(addRelationships);
        }
        
        if (parsed.label){
            return getNodeByLabel(parsed.label)
            .then(addRelationships);
        }

    }
    ,
    //TODO: 
    //for labels (types), type hierachy needs to be enforced - eg if Painter then add Person:Global,-----------------DONE
    //if Painting the add Picture:Creation. These will need to be kept updated.
    //when Lookup is updated, the corresponding label needs to be renamed MATCH (n:OLD_LABEL)  REMOVE n:OLD_LABEL SET n:NEW_LABEL--------------- DONE
    //when updating Type, label needs to be updated, when creating----------------------DONE
    //When we come to modifying labels on creations, their relationships will need to be kept updated
    save: function (n,user) {

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
    //--temp.relationships: relationships defined as properties. Not Required.
    //--temp.links: links .. ??? Not Required
    //user is an optional parameter
    //--if supplied and user exists a 'created' relationship is added
    //Following save each rel is created as a neo4j relationship
    insert:function(n,user)
    {
      
       if (n.id >-1) throw ("Node must have ID < 0 for insert");
       if (!(n.labels instanceof Array)) throw ("Node must have labels array property");

        var props = nodeUtils.trimForSave(n);
        
        nodeUtils.setLabelParents(n);
        var q = "create (n:" + n.labels.join(":") + " {props}) with n set n.created=timestamp() ";

        //if user passed as second argument create a link to the user from this node
        if (user) {
            q += " with n  MATCH (u:User {Lookup:'" + user.lookup + "'})  create (u) - [s:CREATED]->(n)";
        }
        q += " return ID(n),n,LABELS(n)  ";
        return cypher.executeQuery(q, "row", { "props": utils.pascalCase(props) })
            .then(function (data) {

                let saved = utils.camelCase(data[0].row[1]);
                saved.id = data[0].row[0];
                saved.labels = data[0].row[2];

                let statements = [];
                //create relationships from n.relationships
                if (n.temp && n.relationships){
                  
                    for (let prop in n.relationships) {
                        let rel = n.relationships[prop];
                        
                        if (rel.predicate.Direction === "out") {
                            
                            for (let i = 0; i < rel.items.length; i++) {
                                let e = rel.items[i];
                                statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.lookup + "] -> (m)"));
                            }
                        }
                        else {
                            for (let i = 0; i < rel.items.length; i++) {
                                let e = rel.items[i];
                                statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.lookup + "] -> (n)"));
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
                        statements.push(cypher.buildStatement("create (l:Link {props}) with l MATCH (n) where ID(n)=" + n.id + " create (n) - [r:LINK] -> (l) ", "row", { props: utils.pascalCase(e) }));
                    }
                }
             

                if (statements.length) {
                    return cypher.executeStatements(statements).then(function (results) {
                        //add properties to the node
                        let out = addSchema(saved);
                        return nodeUtils.addRelationships(out);
                    });
                }
                else {
                    return addSchema(saved);
                }
            });
    }
    ,
    getSchema:function(id){
        return that.get(id)
        .then(
            function(n){return getSchema(n);
            });
    }
   
    ,
    update:function(n,user){

        if (n.id <=-1) throw ("Node must have ID >=0 for update");

        var props = nodeUtils.trimForSave(n);
        
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
                    if (existing.label && existing.label != n.label) {
                        statements.push({ statement: "match(n:" + existing.label + ") remove n:" + existing.label + " set n:" + n.label });
                    }
                
                    statements.push(cypher.buildStatement("match(n) where ID(n)=" + n.id + "  set n= {props} return ID(n),n,LABELS(n) ", "row", { "props": utils.pascalCase(props) }));
                
                
                    //update labelled
                    //can only do this if < 50 items labelled or request gets too large
                    if (n.labelled && !n.temp.labelledOverflow) {
                        var arrLabelled = n.labelled.map(function (i) { return i.id; });
                        var arrExistingLabelled = existing.labelled.map(function (i) { return i.id; });
                        arrLabelledToRemove = _.difference(arrExistingLabelled,arrLabelled);
                        arrLabelledToAdd = _.difference(arrLabelled,arrExistingLabelled);
                        if (arrLabelledToAdd.length) {
                            statements.push({ statement: "match(n:Label) where ID(n) in [" + arrLabelledToAdd.join(",") + "] set n:" + props.label });
                        }
                        if (arrLabelledToRemove.length) {
                            statements.push({ statement: "match(n:Label) where ID(n) in [" + arrLabelledToRemove.join(",") + "] remove n:" + props.label });
                        }
                    }
                
                return cypher.executeStatements(statements)
                    .then(function (results) {
                        
                        var nodeData = results[statements.length - 1].data[0].row;
                        var saved = utils.camelCase(nodeData[1]);
                        saved.id = nodeData[0];
                        saved.labels = nodeData[2];
                        
                        
                        statements = [];
                        
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
                        
                        for (let rel in existing.relationships) {
                            let rel = n.relationships[rel];
                            let existingRel = existing.relationships[rel];
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
                                var out = _.extend(n, addSchema(saved));//might be more convincing to reload the relationships instead of merging existing object
                                return out;
                            });

                        }
                        else {
                            return _.extend(n, addSchema(saved));//might be more convincing to reload the relationships instead of merging existing object
                        }

                });
            });
        
    }
    ,
    //Deletes node and relationships forever
    destroy: function (node) {

        var q = "match (n) where ID(n)=" + node.id + "  OPTIONAL MATCH (n)-[r]-()  delete n,r";
        return cypher.executeQuery(q);
    }
    ,
    //Logical delete (relationships are left intact)
    //--removes labels and adds label Deleted
    //--sets property deleted = timestamp
    //--stores labels in oldlabels property
    delete: function (node) {

        if (!node || !node.id){
            throw "node not supplied";
        }

        var statements = [];
        var q = "match(n)  where ID(n)=" + node.id + "  remove n:" + node.labels.join(':');
        q += " set n:Deleted,n.oldlabels={labels},n.deleted=timestamp()  return ID(n),n,LABELS(n)";
        
        //remove existing labels and add deleted label
        statements.push(cypher.buildStatement(q, "row", { "labels": node.labels }, true));
        return cypher.executeStatements(statements).then(function (results) {
            var nodeData = results[0].data[0].row;
            var deleted = nodeData[1];
            deleted.id = nodeData[0];
            deleted.labels = nodeData[2];
            return addSchema(deleted);
        });
    }
    ,
    //Removes 'Deleted' label and restores old labels
    //Currently requires the 'oldlabels' property to be present on the node
    restore: function (node) {

        if (!node || !node.id){
            throw "node not supplied";
        }

        var q = "match(n)  where ID(n)=" + node.id + "  set n:" + node.oldlabels.join(':');
        q += " remove n:Deleted,n.oldlabels,n.deleted return ID(n),n,LABELS(n) ";

        return cypher.executeQuery(q).then(function (results) {
            
            var nodeData = results[0].data[0].row;
            var saved = utils.camelCase(nodeData[1]);
            saved.id = nodeData[0];
            saved.labels = nodeData[2].sort();
            return addSchema(saved);
        });
    }
    ,
    list:{
        //returns an array of the labels (not pictures) that have this label
        labelled: function (label,limit) {
            
            limit = limit || 50;
            var statements = [];
            statements.push(cypher.buildStatement("match (n:Label:" + changeCase.pascalCase(label) + ") return ID(n),n.Lookup,n.Type,n.Label limit " + limit, "row"));
            return cypher.executeStatements(statements).then(function (results) {
                var labelled = [];
                var out = results[0].data;
                for (var i = 0; i < out.length; i++) {
                    var item = {
                        id: out[i].row[0],
                        lookup: out[i].row[1],
                        type: out[i].row[2],
                        label: out[i].row[3]
                    };
                    labelled.push(item);
                }
                return labelled;
            });

        }
    }
};


return that;
 
};

