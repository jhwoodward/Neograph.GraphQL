module.exports = function(config)
{
    "use strict";

    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var changeCase = require("change-case");
    var _ = require("lodash");



var that = {
    //object containing all types keyed on Lookup
    list: {}
    ,
    isType: function (label) {
        return that.list[label] !== undefined;
    }
    ,
    schema:function(){//return list with full schema
          return cypher.executeQuery(
            //NB types would require at least one property to show up here
            "match (n:Type) return n,collect(r),collect(p),labels(n)",
                "row")
                .then(function (data) {

                });
                
    }
    ,
    refreshList: function () {
        
        return cypher.executeQuery(
            //NB types would require at least one property to show up here
            "match (n:Type)-[r:PROPERTY]->(p:Property) return n,collect(r),collect(p),labels(n)",
                "row")
                .then(function (data) {

            let types = {};
            
            for (let i = 0; i < data.length; i++) {

                var d = data[i];
                var t = utils.camelCase(d.row[0]);
                var labels = d.row[3];
                
                if (t.lookup) {
                    var typeName = changeCase.camelCase(t.lookup);
            
                    var type = {
                        lookup:typeName,
                        description: t.description,
                        props:{},
                        isSystem: labels.indexOf("SystemInfo") > -1,
                        isGlobal:labels.indexOf("Global") > -1
                        };
                    
                    if (t.systemInfo){
                        type.systemInfo = t.systemInfo;
                    }
                    
                    var rels = d.row[1];//relationship has metadata such as 'Required' true/false
                    var props = d.row[2];//array
                    for (let j = 0; j < props.length; j++) {
                        
                        var p = utils.camelCase(props[j]);
                        var propName = changeCase.camelCase(p.lookup);
                        var rel = utils.camelCase(rels[j]);
                        var prop = {
                            name:propName,
                            required: (rel && rel.required) || false,
                            type:p.type || "string",
                        };
                        
                        type.props[propName] = prop;
                    }  
                    types[typeName] = type;
                } 
                else {
                    console.warn("Type without lookup (id:" + d.row[0] + ")");
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