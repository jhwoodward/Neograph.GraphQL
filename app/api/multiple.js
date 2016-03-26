module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var _ = require("lodash");

var that = {

  save: function (multiple) {

        var arrLabelsToRemove = _.difference(multiple.originalLabels,multiple.labels);
        var arrLabelsToAdd = _.difference(multiple.labels,multiple.originalLabels);
        var nodeIDs = multiple.nodes.map(function (node) { return node.id; });
        var statements = [];
        
        if (arrLabelsToAdd.length || arrLabelsToRemove.length) {
            var sAddLabels = "";
            if (arrLabelsToAdd.length) {
                sAddLabels = " set n:" + arrLabelsToAdd.join(":");
            }
            
            var sRemoveLabels = "";
            if (arrLabelsToRemove.length) {
                sRemoveLabels = " remove n:" + arrLabelsToRemove.join(":");
            }
            statements.push({ statement: "match(n) where ID(n) IN [" + nodeIDs.join(',') + "]" + sRemoveLabels + sAddLabels });
        }
        
        if (statements.length) {
            return cypher.executeStatements(statements).then(function (results) {
                return results;
            });
        }
        //else ???
    }


};


return that;


    
    
};

