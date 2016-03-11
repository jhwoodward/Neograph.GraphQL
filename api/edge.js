module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var utils = require("./utils")(config);
    var cypher = require("./cypher")(config);


var that = {

    //saves edge to neo (update/create)
    //TODO: according to certain rules labels will need to be maintained when relationships are created. (update not required as we always delete and recreate when changing start/end nodes)
    //tag a with label b where:
    // a=person and b=provenance (eg painter from france)
    // a=person and n=group, period (eg painter part of les fauves / roccocco)
    // a=picture and b=non-person (eg picture by corot / of tree) - although typically this will be managed through labels directly (which will then in turn has to keep relationships up to date)
    save: function (edge) {//startNode and endNode provide the full node objects for the edge
        
        //remove any empty properties
        for (var p in edge) {
            if (edge[p] === null || edge[p] === undefined || edge[p] === "") {
                delete edge[p];
            }
        }

        if (edge.id) //update
        {
            
            let statements = [];
            statements.push(cypher.buildStatement("match (a)-[r]->(b) where ID(a) = " + edge.start.id + " and ID(b)=" + edge.end.id + " and ID(r)=" + edge.id + " delete r"));
            statements.push(cypher.buildStatement("match(a),(b) where ID(a)=" + edge.start.id + " and ID(b) = " + edge.end.id + " create (a)-[r:" + edge.type + " {props}]->(b) return r"
                                    , "graph"
                                    , { "props": edge.properties }));

            return cypher.executeStatements(statements)
                    .then(function (results) {
                return graph.build(results[0].data);
            });


        }
        else //new
        {
            var aIsPerson = edge.start.labels.indexOf("Person") > -1;
            var bIsProvenance = edge.end.labels.indexOf("Provenance") > -1;
            var bIsGroup = edge.end.labels.indexOf("Group") > -1;
            var bIsPeriod = edge.end.labels.indexOf("Period") > -1;
            
            var tagAwithB = ((aIsPerson && (bIsProvenance || bIsGroup || bIsPeriod)) && edge.type != "INFLUENCES") || edge.type === "TYPE_OF";
            
            let statements = [];
            
            if (tagAwithB) {
                statements.push(cypher.buildStatement("match(a) where ID(a)=" + edge.start.id + " set a:" + edge.end.Lookup));
            }
            
            statements.push(cypher.buildStatement("match(a),(b) where ID(a)=" + edge.start.id + " and ID(b) = " + edge.end.id + " create (a)-[r:" + edge.type + " {props}]->(b) return r"
                    , "graph"
                    , { "props": edge.properties }));
               
            return cypher.executeStatements(statements)
                    .then(function (results) {
                        var out = graph.build(results[statements.length - 1].data);
                        return out;
            });
        }
    }
  
    ,
    delete: function (edge) {

        if (edge && edge.id) {
            
            var statements = [];
            
            //remove label that may be in place due to relationship
            statements.push(cypher.buildStatement("match (a) where ID(a) = " + edge.start.id + " remove a:" + edge.end.Lookup));
            statements.push(cypher.buildStatement("match (a)-[r]->(b) where ID(a) = " + edge.start.id + " and ID(b)=" + edge.end.id + " and ID(r)=" + edge.id + " delete r"));
            //     console.log(statements);
            return cypher.executeStatements(statements);

        }

    }
   
    


    
  
 


};


return that;


    
    
};

