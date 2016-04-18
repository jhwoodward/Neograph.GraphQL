module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend (require('./config.default'), config);

    var cypher = require("./cypher")(config);


var that = {
    
    get: function (userLookup) {
        
        var statements = [];
        
        statements.push(cypher.buildStatement("match (n:User {Lookup:'" + userLookup + "'}) return n", "row"));
        statements.push(cypher.buildStatement("match (n:User {Lookup:'" + userLookup + "'}) - [r:FAVOURITE] - (f:Favourite) - [] -> (item) return ID(item)", "row"));

        return cypher.executeStatements(statements).then(function (results) {
            //    console.log(results);
            var user = results[0].data[0].row[0];
            user.favourites = {};
            
            for (var i = 0; i < results[1].data.length; i++) {
                
                var fav = results[1].data[i];
                var favNodeId = fav.row[0];
                user.favourites[favNodeId] = { id: favNodeId };
            }
            return user;
        });

    }
      ,
    saveFavourite: function (node,user) {

        var statements = [];
        
        var s = "create (n:Favourite:" + user.Lookup + " {created:timestamp()}) ";
        s += "with n MATCH (b),(u:User {Lookup:'" + user.Lookup + "'}) where  ID(b) = " + node.id + " create (u) - [s:FAVOURITE]->(n)-[r:FAVOURITE]->(b)  return ID(r),ID(s)";

        statements.push(cypher.buildStatement(s, null, null, true));
        return cypher.executeStatements(statements);
    }
};


return that;


    
    
};

