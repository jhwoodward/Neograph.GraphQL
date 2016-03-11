module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend (require('./config.default'), config);
    var nodeUtils = require("./node.utils")(config);
    var cypher = require("./cypher")(config);


var that = {
       //returns graph data object for given query(q), with properties nodes, edges containing neo node/edge data by property=id
//node structure is {id:1,labels:[],properties:{}}
//edge structure is 
    //post
    //q = graph query
    get:function (q, returnArray) {
        
        return cypher.executeQuery(q, "graph").then(function (data) {
            return that.build(data, returnArray);
        });

    }
    ,
    build : function (data, returnArray) {
    
    var edges = {};
    var nodes = {};
    var nodeArray = [];
    var edgeArray = [];
    
    for (var i = 0; i < data.length; i++) {
        
        var val = data[i];
        
        for (var relx = 0; relx < val.graph.relationships.length; relx++) {
            var rel = val.graph.relationships[relx];
            edges[rel.id] = rel;
            edgeArray.push(rel);
        }
        
        for (var nodex = 0; nodex < val.graph.nodes.length; nodex++) {
            var node = val.graph.nodes[nodex];
            var n = node.properties;
            n.labels = node.labels;
            n.id = node.id;
            n = nodeUtils.addPropsAndTrim(n);
            nodes[node.id] = n;
            nodeArray.push(n);
        }
    
    }
    
    if (returnArray) {
        return { nodes: nodeArray, edges: edgeArray };
    }
    else {
        return { nodes: nodes, edges: edges };
    }
}


  

};


return that;


    
    
};

