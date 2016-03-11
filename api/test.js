module.exports = function(config){
    
"use strict";
    
var extend = require('extend');  
config = extend ( require('./config.default'), config);
var cypher = require("./cypher")(config);

var graph = require("./graph")(config);

return {
     painters : function () {
        var query = "MATCH (n:Painter) RETURN n, labels(n) as l LIMIT {limit}";
        var params = { limit: 10 };
        return cypher.executeQuery(query, "graph", params).then(function (data) {
            return graph.build(data,true);
        });

    }
    ,
    graph: function () {
        var q = "MATCH(c:Global:American) - [r] - (d:Global) where  not (c-[:TYPE_OF]-d) and not d.Lookup='American' and not c.Lookup='American'  return c,d,r";
        return graph.get(q);
    }



};

    
};

