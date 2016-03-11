module.exports = function(config)
{
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
  

var that = {
    //Alternatively i could query the actual labels and merge them into a distinct array
    distinctLabels: function (labels) {
      
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
            
            
            //for (var datakey in data) {
            //    var val = data[datakey];
            //    for (var labelkey in val.row[0]) {
            //        var label = val.row[0][labelkey];
            //        if (output.indexOf(label) === -1) {
            //            output.push(label);
            //        }
            //    }
            //}
            
            return output;
        });

    }
    ,
//return true if object is empty
 isEmpty: function(obj) {
   
    return Object.keys(obj).length === 0 && JSON.stringify(obj) === JSON.stringify({});

}




};


return that;

};