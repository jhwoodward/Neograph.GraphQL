module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var utils = require("./utils")(config);
    var type = require("./type")(config);
    var cypher = require("./cypher")(config);
    var image = require("./image")(config);
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
                            var img = utils.camelCase(data[i].row[3]);
                            img.id = data[i].row[4];
                            img.labels= data[i].row[5];
                            image.configure(img);
                            n.images.push(img);
                        }
                    }
                    
                    return n;
                }
                else {
                    return null;
                }
            });
    
};

var getList = function(q,options) {

    if (options){
        if (options.pageSize){
            options.pageSize = parseInt(options.pageSize);
        }
        if (options.pageNum){
            options.pageNum = parseInt(options.pageNum);
        }
        if (options.sort && options.sort != "created"){
            options.sort = changeCase.pascalCase(options.sort);
        }
    }
    
    var defaults = {
        pageNum:1,
        pageSize:20,
        sort:"created",
        sortOrder:"DESC"
    };
    
    options = _.extend(defaults,options);

    var startIndex = (options.pageNum-1) * options.pageSize;
    var endIndex = startIndex + options.pageSize;

    var query = q + "  return p,ID(p),LABELS(p),i,ID(i)";
    query += " order by p." + options.sort + " " + options.sortOrder;
    if (startIndex>0){
        query += " skip " + (startIndex);
    }
    query += " limit " + options.pageSize;
     
    var count = q + " return count(p)";
    
    var statements = [query,count];
     
    var out = {options:options,q:query,count:0,items:[]};

    return cypher.executeStatements(statements)
    .then(function (results) {
        
        out.count = results[1].data[0].row[0];
        
      //  data = data.slice(startIndex,endIndex);
      
      var data = results[0].data;

        for (let i=0;i < data.length;i++)
        {
              var props = utils.camelCase(data[i].row[0]);
               var p;     
                if (options.format==="compact"){
                    p = {id:data[i].row[1],title:props.title};
                }
                else{
                    p= _.extend(props,{
                        id:data[i].row[1],
                        labels: data[i].row[2]
                    });
                }
                
            p.image =  image.configure(data[i].row[3],options);
            p.image.id = data[i].row[4];
              

            out.items.push(p);
            
        }

        return out;
                
    }).error(function(x){
        
        
    });
};


var labelQuery = function(labels){
    
       labels = labels.split(',')
                        .map(function(label){
                            return changeCase.pascalCase(label); 
                            })
                        .join(":");
                        
       var q = "match (p:Picture) - [:IMAGE] -> (i:Image:Main)";
       q += " where not p:CacheError and not p:NotFound  and p:" + labels;
       
       return q;
};

var propertyQuery = function(property){
    
    property.name=changeCase.pascalCase(property.name);
    
    var q = "match (p:Picture) - [:IMAGE] -> (i:Image:Main)";
    q += " where  not p:CacheError and not p:NotFound and p." + property.name + "=~ '(?i).*" + property.value + ".*' ";
    
    return q;

};


var predicateQuery = function(predicate){

    //allow multiple predicates input instead
    var relType = predicate.lookup.toUpperCase();
    if (relType==="OF")
    {
        relType +="|:DEPICTS";
    }
    var q = utils.getMatch(predicate.target) + " with n match (n) <- [:" + relType + "] - (p:Picture) - [:IMAGE] -> (i:Image:Main) where  not p:CacheError and not p:NotFound  ";
    
    return q;
};
    
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
        });
    }
    ,
    //can optionally pass an alternative predicate such as 'of'
    //same as /relationship/visual/id if not predicate passed in
    list:
    {
        //Combines multiple queries
        //params is json object posted
        /*
        combined:function(params,options){
            
            var q = [];
            if (params.predicate){
                q.push(predicateQuery(params.predicate));
            }
            if (params.property){
                q.push(propertyQuery(params.property));
            }
            if (params.labels){
                 q.push(labelQuery(params.labels));
            }
            
            return getList(q,options);
        }
        ,
        */
        predicate:  function (params,options) {
            
            var q=predicateQuery({lookup:params.predicate,target:params.id});
            return getList(q,options);
        }
        ,
       //returns an array of pictures that have this label
        labelled: function (params,options) {
  
            var q = labelQuery(params.labels);
            return getList(q,options);
            
        }
        ,
        property:function(params,options){

            var q = propertyQuery({name:params.prop,value:params.val});
            return getList(q,options);
        }
    }
   
    
   
};


return that;
 
};

