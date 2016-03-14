module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var type = require("./type")(config);
    var predicate = require("./predicate")(config);
    var cypher = require("./cypher")(config);
    var changeCase = require("change-case");

    var _=require("lodash");

var that = {
  

 configureImage : function (image) {
    
    
    if (image) { //load if not present ? async problem
        
        var contentRoot = config.media.root;
        var thumbWidth = 236;//180;
        var isUpload = image.cache && image.cache.indexOf("upload/") === 0;
        
        if (isUpload) {
            
            image.source = {
                name: image.cache.replace("upload/", "").substring(0, image.cache.replace("upload/", "").indexOf("/")),
                ref: undefined//add link to user page
            };

        }
        else {
            
            image.source = {
                name: image.site ,
                ref: image.ref || "http://" + image.site,
                url: image.url
            };
        }

        image.thumbHeight = parseInt(thumbWidth / (image.width / image.height));
        image.thumbWidth = thumbWidth;
        
        //replace url/thumb with cached copy if present (?)
        if (image.cache) {
            image.thumb = contentRoot + "thumbnail/" + image.cache.replace(/ /g, '%20');
            image.url = contentRoot + "original/" + image.cache.replace(/ /g, '%20');
        }
    }
    
    return image;
}
,
//returns a new property object for the node
//--removes any empty propertes
//--removes id property as this is internal to neo4j
//--removes labels property as this is persisted with labels in neo4j
//--remove temp property as this data should not be persisted
trimForSave : function (n) {
    
    var props = {};
    
    for (var key in n)
    {
        if (n[key] !== null && n[key] !== undefined && n[key] !== "" &&
         key !== "labels" && 
         key !== "labelled" && 
         key != "relationships" && 
         key != "image" && 
         key !== "id" && 
         key !== "temp")
         {
             props[key] = n[key];
         }
    }

    return props;

}

 ,
    //if the node has any values in its labels array that match picture or person types
    //the corresponding parent label is added to the array
    //The array is uniqued before returning
    setLabelParents: function (n) {
        
        if (n.labels && n.labels.length)
        {
             var labels = JSON.parse(JSON.stringify(n.labels));

            if (_.intersection(labels,type.pictureTypes).length) {
                labels.push("Picture");
            }
            
            if (_.intersection(labels,type.personTypes).length) {
                labels.push("Person");
            }

            n.labels = _.uniq(labels);
        }
 
        return n;



    }

};


return that;


    
    
};

