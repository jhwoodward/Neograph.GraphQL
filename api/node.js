module.exports = function(config){
    
    "use strict";
    
  
    var _ = require("lodash");
    config = _.extend(require('./config.default'), config);
    var image = require("./image")(config);
    var label = require("./label")(config);
    var utils = require("./utils")(config);
    var type = require("./type")(config);
    var cypher = require("./cypher")(config);
    var graph = require("./graph")(config);
    var relationship = require("./relationship")(config);
    var changeCase = require("change-case");
  
//data[0].row 
//n , ID, labels
function parseNodeData(data){
    var n = utils.camelCase(data[0].row[0]);
    if (data[0].row[1]){
        n.id = data[0].row[1];
    }
    if (data[0].row[2]){
        n.labels = data[0].row[2];
        if (n.labels) n.labels.sort();
    }
    return n;
}

function getNode(match, where) {
    
    return cypher.executeQuery("match(" + match + ")  where " + where + " with n optional match (" + match + ") -[:IMAGE] - (i:Image:Main) return n,ID(n),LABELS(n),i ", "row")
    .then(function (data) {
        if (data.length) {

            var n = parseNodeData(data);
            if (data[0].row[3]){
               n.image = image.configure(data[0].row[3]);
            }
            addSchema(n);
            return n;
        }
        else {
            return null;
        }
    });
}

function getNodeById(id) {
    return getNode("n", "ID(n) = " + id );
}

function getNodeByLabel(label) {
    return getNode("n:Label", "n.Label = '" + label + "'");
}

function addRelationships(n) {
   
    return relationship.list.conceptual(n).then(function(r){
        
        if (Object.keys(r).length){
            n.relationships=r;
        }
        return n;
    });
}

 //Create relationships for node n
        //requires presence of n.relationships
function createRelationships(n){

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
        return that.getWithRels(n);
    });
    
}

function updateRelationships(n)
{
        
    var statements = [];
    
        //check passed in node against saved node for differences
    return that.getWithRels(n).then(function(existing){
        
        for (let key in n.relationships) {
            let rel = n.relationships[key];
            let existingRel = existing.relationships ? existing.relationships[key]:null;
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
                    statements.push(cypher.buildStatement("match n,m where ID(n)=" + n.id + " and ID(m)=" + e.id + "  create (n)-[:" + rel.predicate.lookup.toUpperCase() + "] -> (m)"));
                }
                else if (rel.predicate.direction === "in")  {
                    statements.push(cypher.buildStatement("match n,m where ID(n)=" + n.id + " and ID(m)=" + e.id + "  create (m)-[:" + rel.predicate.lookup.toUpperCase() + "] -> (n)"));
                }
                else{
                    throw("Invalid predicate direction: " + rel.predicate.direction);
                }
            }
            
            for (let i = 0; i < rel.itemsToRemove.length; i++) {
                let e = rel.itemsToRemove[i];
                if (rel.predicate.direction === "out") {
                    statements.push(cypher.buildStatement("match (n) - [r:" + rel.predicate.lookup.toUpperCase() + "] -> (m) where ID(n)=" + n.id + " and ID(m)=" + e.id + "  delete r"));
                }
                else if (rel.predicate.direction === "in")  {
                    statements.push(cypher.buildStatement("match (m) - [r:" + rel.predicate.lookup.toUpperCase() + "] -> (n) where ID(n)=" + n.id + " and ID(m)=" + e.id + "  delete r"));
                }
                else{
                    throw("Invalid predicate direction: " + rel.predicate.direction);
                }
            }
        }
        
        for (let key in existing.relationships) {
            let rel = n.relationships ? n.relationships[key]:null;
            let existingRel = existing.relationships[key];
            if (!rel) {
                for (var i = 0; i < existingRel.items.length; i++) {
                    var e = existingRel.items[i];
                    if (existingRel.predicate.direction === "out") {
                        statements.push(cypher.buildStatement("match (n) - [r:" + existingRel.predicate.lookup + "] -> (m) where ID(n)=" + n.id + " and ID(m)=" + e.id + "  delete r"));
                    }
                    else if (existingRel.predicate.direction === "in") {
                        statements.push(cypher.buildStatement("match (m) - [r:" + existingRel.predicate.lookup + "] -> (n) where ID(n)=" + n.id + " and ID(m)=" + e.id + "  delete r"));
                    }
                    else{
                        throw("Invalid predicate direction: " + existingRel.predicate.direction);
                    }
                }
            }
        }
        
        if (statements.length){
            return cypher.executeStatements(statements).then(function(){
                return that.getWithRels(n);
            });
        }
        else{
            return existing;
        }

    });
}

    
 function updateProperties(n){
        
         //update props
        var q = "match(n) where ID(n)={id} set n={props} return n,ID(n),LABELS(n)";
        return cypher.executeQuery(q, "row", { "id": n.id,"props": that.trimForSave(n) })
        .then(parseNodeData);
    }

function updateLabels(n){

        label.addParents(n);

        var statements=[];
        
        //check passed in node against saved node for differences
        return that.get(n)
            .then(function(existing){
            
            //simpler to 
            var arrLabelsToRemove = _.difference(existing.labels,n.labels);//The array to inspect, The values to exclude.
            var arrLabelsToAdd = _.difference(n.labels,existing.labels);
            
            if (arrLabelsToAdd.length || arrLabelsToRemove.length) {
                var sAddLabels = "";
                if (arrLabelsToAdd.length) {
                    sAddLabels = " set n:" + arrLabelsToAdd.join(":");
                }
                
                var sRemoveLabels = "";
                if (arrLabelsToRemove.length) {
                    sRemoveLabels = " remove n:" + arrLabelsToRemove.join(":");
                }
                statements.push({ statement: "match(n) where ID(n)=" + n.id + sRemoveLabels + sAddLabels});
            }
            
            //update item labels if changing Label property
            if (existing.label && existing.label != n.label && n.label) {
                statements.push({ statement: "match(n:" + existing.label + ") remove n:" + existing.label + " set n:" + n.label });
            }
            
            if (statements.length){
                return cypher.executeStatements(statements).then(function(){
                    return that.get(n);
                });
            }
            else{
                return n;
            }
                
        });
     
    
    
}
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
    //returns a new property object for the node
    //--removes any empty propertes
    //--removes id property as this is internal to neo4j
    //--removes labels property as this is persisted with labels in neo4j
    //--remove temp property as this data should not be persisted
    trimForSave : function (n) {
        
        var props = {};
        
        for (var key in n)
        {
            if (n[key] !== null && n[key] !== undefined && n[key] !== "" &&
            key !== "labels" && 
            key !== "labelled" && 
            key != "relationships" && 
            key != "image" && 
            key !== "id" && 
            key !== "temp" &&
            key !== "web")//web links ?? not implemented yet
            {
                props[key] = n[key];
            }
        }
        return utils.pascalCase(props);
    }
    ,
    //TODO: 
    //for labels (types), type hierachy needs to be enforced - eg if Painter then add Person:Global,-----------------DONE
    //if Painting the add Picture:Creation. These will need to be kept updated.
    //when Lookup is updated, the corresponding label needs to be renamed MATCH (n:OLD_LABEL)  REMOVE n:OLD_LABEL SET n:NEW_LABEL--------------- DONE
    //when updating Type, label needs to be updated, when creating----------------------DONE
    //When we come to modifying labels on creations, their relationships will need to be kept updated
    save: function (n,user) {

        if (n.id > -1) { 
           return that.update(n,user);
        }
        else {
           return that.create(n,user);
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
    create:function(n,user)
    {
        if (n.id >-1) throw ("Node must have ID < 0 for insert");
        if (!(n.labels instanceof Array)) throw ("Node must have labels array property");

        label.addParents(n);
        var q = "create (n:" + n.labels.join(":") + " {props}) with n set n.created=timestamp() ";

        //if user passed as second argument create a link to the user from this node
        if (user) {
            q += " with n  MATCH (u:User {Lookup:'" + user.lookup + "'})  create (u) - [s:CREATED]->(n)";
        }
        q += " return n,ID(n)";

        return cypher.executeQuery(q, "row", { "props": that.trimForSave(n) })
            .then(function (data) {
                n=parseNodeData(data);
                return createRelationships(n);
            });
    }

    ,
    update:function(n,user){

        if (n.id <=-1) throw ("Node must have ID >=0 for update");

        //NB Have to update labels before properties in case label property has been modified
        return  updateLabels(n).
                then(function(){return updateProperties(n)}).
                then(function(){return updateRelationships(n)});  
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

        var q = "match(n)  where ID(n)=" + node.id + "  remove n:" + node.labels.join(':');
        q += " set n:Deleted,n.oldlabels={labels},n.deleted=timestamp()  return n,ID(n),LABELS(n)";
        
        return cypher.executeQuery(q, "row", { "labels": node.labels })
        .then(parseNodeData);
  
    }
    ,
    //Removes 'Deleted' label and restores old labels
    //Currently requires the 'oldlabels' property to be present on the node
    restore: function (node) {

        if (!node || !node.id){
            throw "node not supplied";
        }

        var q = "match(n)  where ID(n)=" + node.id + "  set n:" + node.oldlabels.join(':');
        q += " remove n:Deleted,n.oldlabels,n.deleted return n,ID(n),LABELS(n) ";

        return cypher.executeQuery(q)
        .then(parseNodeData);
    }
    ,
    getSchema:function(id){
        return that.get(id).then(getSchema);
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

