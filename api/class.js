module.exports = function(config)
{
    "use strict";

    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var changeCase = require("change-case");
    var predicate = require("./predicate")(config);
    var _ = require("lodash");



var that = {
    //object containing all types keyed on Lookup
    list: {}
    ,
    isClass: function (label) {
        return that.list[label] !== undefined;
    }
    ,
    getSchema:function(id){//return list with full schema
        
        var q = "match (n:Class {Lookup:{id}}) - [:EXTENDS*] -> (b:Class)-[:PROPERTY]->(p:Property) return p";
        return cypher.executeQuery(q,null,{id:id})
            .then(function (data) {
                
                    var out = {};
                
                    for (let i = 0; i < data.length; i++) {
                        
                        var p = utils.camelCase(data[i].row[0]);
                        out[p.lookup] = p;
                    }
                    return out;
            });     
    }
    ,
    refreshList: function () {
        return predicate.refreshList().then(that.buildSchema);
    }
    ,
    buildSchema:function(predicates){
        
        
        var self = "match (n:Class) optional match n - [r:PROPERTY] -> (p:Property) return n,collect(r),collect(p),labels(n)";
        var parents = "match (n:Class) - [:EXTENDS*] -> (b:Class)-[r:PROPERTY]->(p:Property) return n,collect(r),collect(p),labels(n)";

        var rels = "match (n:Class) -[r] -> (c:Class)  where type(r)<>'EXTENDS' and type(r) <> 'PROPERTY' return n,collect(type(r)),collect(c)";
        
        return cypher.executeStatements([self,parents,rels])
            .then(function (results) {
                
            var self =    results[0].data;
            var parents = results[1].data;
          

            let types = {};
            
            for (let i = 0; i < self.length; i++) {

                var d = self[i];
                var t = utils.camelCase(d.row[0]);
                var parent = parents.find(function(item){return item.row[0].Lookup === d.row[0].Lookup});
            
     
                var labels = d.row[3];
                
                if (t.lookup) {
                    var typeName = changeCase.camelCase(t.lookup);
            
                    var type = {
                        lookup:t.lookup,
                        description: t.description,
                        isSystem: labels.indexOf("SystemInfo") > -1,
                        isGlobal:labels.indexOf("Global") > -1
                        };
                    
                    if (t.systemInfo){
                        type.systemInfo = t.systemInfo;
                    }
                    
                    //combine own props with parent's
                    var rels = d.row[1];//array;//relationship has metaself such as 'Required' true/false
                 
                    var props = d.row[2];//array
                    
                    if (parent && parent.row[1]){
                        rels = rels.concat(parent.row[1]);
                    }
                    if (parent && parent.row[2]){
                        props = props.concat(parent.row[2]);
                    }
                    
                    for (let j = 0; j < props.length; j++) {
                        
                        var p = utils.camelCase(props[j]);
                        var propName = changeCase.camelCase(p.lookup);
                        var rel = utils.camelCase(rels[j]);
                        var prop = {
                            name:propName,
                            required: (rel && rel.required) || false,
                            type:p.type || "string",
                        };
                        
                        if (!type.props) type.props = {};
                        
                        type.props[propName] = prop;
                    }  
                    
                    
                    //only add if it has props - otherwise it has no use
                    if (type.props){
                        types[t.lookup] = type;
                    }
                    
                 
                    
                } 
                else {
                    console.warn("Type without lookup (id:" + d.row[0] + ")");
                }
            }
            
            let relTypes = results[2].data;
          
            for (let tkey in types){
                let t = types[tkey];
                t.reltypes={};
                 let rel = relTypes.find(function(item){return t.lookup === item.row[0].Lookup});
                 if (rel){
                       for (let x = 0; x < rel.row[1].length;x++){
                           let relType=rel.row[1][x];
                           t.reltypes[relType]=rel.row[2][x].Lookup;
                       }
                 }
                 
            }
            
            
            
            
            
        
            that.list = types;
            return types;
        });
        
    }
    ,
    isSystemInfo: function (label) {
        
        return label == "Global" || label == "Type" || label == "Label" || label == "SystemInfo";
    },
    //should be in the ui
    getLabelClass: function (node, label) {

        if (node && label === node.Type) {
            return 'label-warning';
        }
        
        if (that.isSystemInfo(label)) {
            return 'label-system';
        }
        
        if (that.isType(label)) {
            return 'label-inverse pointer';
        }
        return 'label-info';
    }
    ,
    personTypes: ['Painter',
        'Illustrator',
        'Philosopher',
        'Poet',
        'FilmMaker',
        'Sculptor',
        'Writer',
        'Patron',
        'Leader',
        'Explorer',
        'Composer',
        'Scientist',
        'Caricaturist',
        'Mathematician']
    ,
    pictureTypes: ['Painting', 'Illustration', 'Drawing', 'Print']
    ,
    isPerson: function (type) {
        return that.personTypes.indexOf(type) > -1;
    }
    /*
    ,
    items:function(id){
        var q = "match n:"
    }
    */

};

return (function(){
     that.refreshList();
     return that;
})();


};