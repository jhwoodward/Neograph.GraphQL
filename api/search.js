module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);


    var search = function(q){
        
        return cypher.executeQuery(q, "row").then(function (data) {
                    var out = data.map(function (d) {
                        return {
                            id: d.row[0],
                            Lookup: d.row[1],
                            Type: d.row[2],
                            Label: d.row[3]
                        };
                    });
                    return out;
                });
        
    };

    //searches are performed on the Lookup property only as a 'contains' wildcard
    var that = {

        label:function(label,txt){
            if (txt) {
                let q = "";
                if (txt==="*"){
                    q = "match (n:" + label + ")  return ID(n),n.Lookup,n.Type,n.Label ";

                }
                else{
                    q = "match (n:" + label + ") where n.Lookup =~ '(?i).*" + txt + ".*'  return ID(n),n.Lookup,n.Type,n.Label ";
                }
                
                return search(q);
            }
            
        }

    };


    return that;

};

