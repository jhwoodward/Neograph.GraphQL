module.exports = function(config){
    
    "use strict";
    
    config = extend ( require('./config.default'), config);
    var utils = require("./utils")(config);
    var cypher = require("./cypher")(config);
    var _=require("lodash");

var that = {

    configure : function (image) {

        if (image) { 
            
            image = utils.camelCase(image);
            
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
 


};


return that;


    
    
};

