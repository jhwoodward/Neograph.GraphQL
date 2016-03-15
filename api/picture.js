module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var nodeUtils = require("./node.utils")(config);
    var utils = require("./utils")(config);
    var type = require("./type")(config);
    var cypher = require("./cypher")(config);
    var graph = require("./graph")(config);
    var relationship = require("./relationship")(config);
    var changeCase = require("change-case");
    var _ = require("lodash");





var getImages = function (n) {
    
    var statements = [];
    
    //update these queries for - [:IMAGE] - (i:Image)
    
    //pictures  / images
    if (n.temp.isPicture) { //if picture return images (these are other - usually less good - images of the same picture)
          }
    else if (n.temp.isGroup) {//todo:also return images linked /tagged directly
            }
    else {
    }
    
    return cypher.executeStatements(statements)
        .then(function (results) {
            return graph.build(results[0].data, true).nodes;
        });

};




var that = {
    //same as get node except that all images are returned instead of just the main one
    //and picture relationships are added
    get:function(id){

        var q= utils.getMatch(id) + " with n optional match (n) - [:IMAGE] - (i:Image)  return n,ID(n),LABELS(n),i,ID(i),LABELS(i) ";
        
        return cypher.executeQuery(q, "row")
            .then(function (data) {
                if (data.length) {

                    var n = utils.camelCase(data[0].row[0]);
                    n.id = data[0].row[1];
                    n.labels = data[0].row[2];
                    if (n.labels) n.labels.sort();

                    n.images = [];
                    
                    for (let i=0;i < data.length;i++)
                    {
                        if (data[i].row[3]){
                            var image = utils.camelCase(data[i].row[3]);
                            image.id = data[i].row[4];
                            image.labels= data[i].row[5];
                            nodeUtils.configureImage(image);
                            n.images.push(image);
                        }
                    }
                
                    return relationship.visual(n).then(function(r){
                        n.pictures=r;
                        return n;
                    });

                }
                else {
                    return null;
                }
            });
    
    
    }
    ,
    //can optionally pass an alternative predicate such as 'of'
    //same as /relationship/visual/id if not predicate passed in
    list: function (id,predicate) {

        predicate = predicate || "BY";
        predicate = predicate.toUpperCase();
        
        if (predicate==="OF")
    {
        predicate +="|:DEPICTS";
    }

        var q= utils.getMatch(id) + " with n match (n) <- [:" + predicate + "] - (p:Picture) - [:IMAGE] -> (i:Image:Main)  return n,ID(n),LABELS(n), p,ID(p),LABELS(p),i,ID(i) order by p.Status DESC limit 50";
        
          return cypher.executeQuery(q, "row")
            .then(function (data) {
                if (data.length) {

                    var n = utils.camelCase(data[0].row[0]);
                    n.id = data[0].row[1];
                    
                    //trim
                    delete n.text;
                     
                    n.pictures= [];
                       
                    for (let i=0;i < data.length;i++)
                    {
                         if (data[i].row[3]){
                            var p = utils.camelCase(data[i].row[3]);
                            p.id = data[i].row[4];
                            p.labels = data[i].row[5];
                            p.image = utils.camelCase(data[i].row[6]);
                            p.image.id = data[i].row[7];
                            nodeUtils.configureImage(p.image);
                            
                            n.pictures.push(p);
                        }
                    }

                    return n;
                }
                else {
                    return null;
                }
            });
        
      
      
 
    }
    
   
};


return that;
 
};

