module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var type = require("./type")(config);
    var predicate = require("./predicate")(config);
    var nodeUtils = require("./node.utils")(config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var changeCase = require("change-case");

    var _=require("lodash");
    
    
    var relationships = function(statements)
    {
        return cypher.executeStatements(statements).then(function (results) {
                
                var outRels = results[0].data;
                var inRels = results[1].data;
                var relationships = {};
                var i;
            
                //out
                for (i = 0; i < outRels.length; i++) {
                    
                    let p = predicate.get(outRels[i].row[4]).setDirection("out");
                    let key = p.toString();
                    let item = {
                        id: outRels[i].row[0],
                        lookup: outRels[i].row[1],
                        type: outRels[i].row[2],
                        label: outRels[i].row[5]
                    };
                    
                       //add image for picture if present
                    if (outRels[i].row[6]){
                        item.image = utils.camelCase(outRels[i].row[6]);
                        item.image.id= outRels[i].row[7];
                        item.image.labels =outRels[i].row[8];
                        nodeUtils.configureImage(item.image);
                    }
                    
                    if (!relationships[key]) {
                        relationships[key] = {
                            predicate: p, 
                            items: [item]
                        };
                    }
                    else {
                        relationships[key].items.push(item);
                    }
                }

                //in
                for (i = 0; i < inRels.length; i++) {
                    let p = predicate.get(inRels[i].row[4]).setDirection("in");
                    let key = p.toString();
                    let item = {
                        id: inRels[i].row[0],
                        lookup: inRels[i].row[1],
                        type: inRels[i].row[2],
                        label: inRels[i].row[5]
                    };
                    
                    //add image for picture if present
                    if (inRels[i].row[6]){
                        item.image = utils.camelCase(inRels[i].row[6]);
                        item.image.id= inRels[i].row[7];
                        item.image.labels =inRels[i].row[8];
                        nodeUtils.configureImage(item.image);
                    }

                    if (!relationships[key]) {
                        relationships[key] = {
                            predicate: p, 
                            items: [item]
                        };
                    }
                    else {
                        relationships[key].items.push(item);
                    }
                }
                return relationships;
            });
    };

var that = {
    get:function(n){
        
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
    //Builds a relationships object and adds it to the node (n)
    //Relationships are aggregated by [predicate + direction ('->' or '-<')] which form the object keys
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
    //picture relationships 
    //can be used to get pictures related to an conceptual entity (eg paintings by an artist)
    //or to get pictures related to a picture
    visual:function(id){
            var match = utils.getMatch(id);
            var statements = [];
            //out 
            statements.push(cypher.buildStatement(match + " with n match (n) - [r] -> (m:Picture) - [:IMAGE] -> (i:Image:Main)  return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label,i,ID(i),LABELS(i)", "row"));
            //in
            statements.push(cypher.buildStatement(match + " with n match (n) <- [r] - (m:Picture)- [:IMAGE] -> (i:Image:Main)  return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label,i,ID(i),LABELS(i)", "row"));
            return relationships(statements);
    }
    ,
    visualComparison(a,b){
        
        //return picture links between 2 artists
        
    }


};


return that;


    
    
};

