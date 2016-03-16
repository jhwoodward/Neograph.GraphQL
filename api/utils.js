module.exports = function(config)
{
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var changeCase = require("change-case");

var that = {
    //Provide match to match on label(s) eg :Picture
    getMatch:function(id,alias,match)
    {
        match = match || "";
        alias = alias || "n";
        
        var parsed = that.parseIdOrLabel(id);
        var q;
        
        if (parsed.id){
            q = "match (" + alias + match + ")  where ID(" + alias + ") = " + parsed.id;
        }
        else if (parsed.label){
            q = "match (" + alias + match + ":Label)  where " + alias + ".Label = '" + parsed.label + "'";
        }
        return q;
    }
    ,
    parseIdOrLabel : function(id){
        if (isNaN(id)){
                //handle possibility of node object being passed in
                //instead of just the id
                if (id.id){
                    return {id:id.id};
                }
                else if (typeof id === "string")
            {
                return {label:changeCase.pascalCase(id)};
            }
                
            }
            else{
                return {id:id};
            }
    }
    ,
    camelCase : function(props){
        var out = {};
        for (var key in props){
            out[changeCase.camelCase(key)] = props[key];
        }
        return out;          
    }
    ,
    pascalCase : function(props){
        var out = {};
        for (var key in props){
            out[changeCase.pascalCase(key)] = props[key];
        }
        return out;          
    }
  
    ,
//return true if object is empty
 isEmpty: function(obj) {
   
    return Object.keys(obj).length === 0 && JSON.stringify(obj) === JSON.stringify({});

}




};


return that;

};