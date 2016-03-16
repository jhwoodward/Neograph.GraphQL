module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var type = require("./type")(config);
    var predicate = require("./predicate")(config);
    var cypher = require("./cypher")(config);
    var changeCase = require("change-case");

    var _=require("lodash");

var that = {

    //Alternatively i could query the actual labels and merge them into a distinct array
    distinct: function (labels) {
      
        var q;
        
        if (labels) {
            q = "match (n:" + labels.join(':') + ") return distinct(LABELS(n))";
        }
        else {
            q = req.body.q;
        }
        return cypher.executeQuery(q).then(function (data) {
            
            var output = [];
            
            for (var i = 0; i < data.length; i++) {
                var val = data[i];
                for (var j = 0; j < val.row[0].length; j++) {
                    var label = val.row[0][j];
                    if (output.indexOf(label) === -1) {
                        output.push(label);
                    }
                }
            }
            return output;
        });

    }
 
    ,
    //Updates node's labels 
    //Updates nodes labelled with this node if node.label is updated
    //returns node
    update:function(n){
        
        that.addParents(n);

        var statements=[];
        
        //check passed in node against saved node for differences
        return node.get(n)
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
                    return node.get(n);
                });
            }
            else{
                return n;
            }
                
        });
     
    }
    ,
    //if the node has any values in its labels array that match picture or person types
    //the corresponding parent label is added to the array
    //The array is uniqued before returning
    getParents: function (labels) {
        var out = [];
        if (labels && labels.length)
        {
            if (_.intersection(labels,type.pictureTypes).length) {
                out.push("Picture");
            }
            if (_.intersection(labels,type.personTypes).length) {
                out.push("Person");
            }
        }
        return n.labels;
    }
    ,
    addParents:function(n){
        n.labels = _.uniq(n.labels.concat(that.getParents(n.labels)));
        return n;
    }
    
          //update labelled
                //can only do this if < 50 items labelled or request gets too large
                /*
                
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
                */
             

};


return that;


    
    
};

