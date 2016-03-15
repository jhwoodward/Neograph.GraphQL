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

var getPicture = function(id){
    
         var q= utils.getMatch(id,"n",":Picture") + " with n optional match (n) - [:IMAGE] -> (i:Image)  return n,ID(n),LABELS(n),i,ID(i),LABELS(i) ";
        
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
                    
                    return n;
                }
                else {
                    return null;
                }
            });
    
}

var getList = function(q,pageNum,pageSize,sort,sortOrder) {

    pageSize = parseInt(pageSize) || 50;
    pageNum = parseInt(pageNum) || 1;
    var startIndex = (pageNum-1) * pageSize;
    var endIndex = startIndex + pageSize;
    //created is lowercase in db at the moment
    sort = sort === "created" ? sort : (changeCase.pascalCase(sort) || "Status");
    sortOrder = sortOrder || "DESC";
    
    q+= "  return p,ID(p),LABELS(p),i,ID(i) order by p." + sort + " " + sortOrder;
    
    return cypher.executeQuery(q)
    .then(function (data) {
        
        data = data.slice(startIndex,endIndex);

        var out = [];
        
        for (let i=0;i < data.length;i++)
        {
            
            var p = utils.camelCase(data[i].row[0]);
            p.id = data[i].row[1];
            p.labels = data[i].row[2];
            p.image = utils.camelCase(data[i].row[3]);
            p.image.id = data[i].row[4];
            nodeUtils.configureImage(p.image);
            
            out.push(p);
            
        }

        return out;
                
    });
}
    
var that = {
    //Same as get node except that all images are returned instead of just the main one
    get:function(id){
        return getPicture(id);
    }
    ,
    //Picture relationships added
    getWithRels:function(id){
        return getPicture(id).then(function(n){
            
            return relationship.list.conceptual(n).then(function(r){
                  n.relationships=r;
                return relationship.list.visual(n).then(function(r){
                    n.relationships = _.merge(n.relationships,r);
                    return n;
                });
            });
        })
    }
    ,
    //can optionally pass an alternative predicate such as 'of'
    //same as /relationship/visual/id if not predicate passed in
    list:
    {
        predicate:  function (id,predicate,pageNum,pageSize,sort,sortOrder) {

            predicate = predicate || "BY";
            predicate = predicate.toUpperCase();
            if (predicate==="OF")
            {
                predicate +="|:DEPICTS";
            }

            var q= utils.getMatch(id) + " with n match (n) <- [:" + predicate + "] - (p:Picture) - [:IMAGE] -> (i:Image:Main)";
            return getList(q,pageNum,pageSize,sort,sortOrder);
        }
        ,
       //returns an array of pictures that have this label
        labelled: function (label,pageNum,pageSize,sort,sortOrder) {
            
            var q = "match (p:Picture:" + changeCase.pascalCase(label) + ") - [:IMAGE] -> (i:Image:Main)";
            return getList(q,pageNum,pageSize,sort,sortOrder);
            
        }
    }
   
    
   
};


return that;
 
};

