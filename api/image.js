module.exports = function(config){
    
    "use strict";
    
    var _= require("lodash");
    config = _.extend( require('./config.default'), config);
    var utils = require("./utils")(config);
    var cypher = require("./cypher")(config);
   

var that = {
    //options
    //format=compact
    configure : function (image,options) {

        if (options.thumbWidth){
            options.thumbWidth = parseInt(options.thumbWidth);
        }
        var defaultOptions = {format:"verbose",thumbWidth:236};
        options = _.extend(defaultOptions,options)
        
        if (image) { 
            
            image = utils.camelCase(image);
            
            var contentRoot = config.media.root;
            var isUpload = image.cache && image.cache.indexOf("upload/") === 0;
            
            image.thumb = {
                width: options.thumbWidth,
                height: parseInt(options.thumbWidth / (image.width / image.height))
            };
            //replace url/thumb with cached copy if present (?)
            if (image.cache) {
                image.thumb.url = contentRoot + "thumbnail/" + image.cache.replace(/ /g, '%20');
                image.url = contentRoot + "original/" + image.cache.replace(/ /g, '%20');
            }
            
            //Set source info
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

            delete image.cache;
            delete image.site;
                
            if (options.format==="compact")
            {
                delete image.site;
                delete image.ref;
                delete image.size;
                delete image.cacheHigh;
                delete image.urlCaptured;
                delete image.source;
            }
        }
        
        return image;
    }
 


};


return that;


    
    
};

