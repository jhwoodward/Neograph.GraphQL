module.exports = function(config){
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./configDefault'), config);
    
    var utils = require("./utils")(config);

var that = {
    
 setPropsAndTabsFromLabels : function (n) {
    
    var node = JSON.parse(JSON.stringify(n));// angular.copy(n);
    
    node.temp.tabs = ["Properties"];// defaultTabs;
    
    //add empty props to node according to labels
    //the data about which props / tabs to add is stored against the types which are cached in utils
    var i,j;
    
    for (i = 0; i < node.labels.length; i++) {
        
        var label = node.labels[i];
        
        if (utils.types[label]) {
            
            var t = utils.types[label];//retrieve the type from the label text
            
            if (t.Props) {
                
                var arrProps = t.Props.split(',');
                var objProps = {};
                
                for (j = 0; j < arrProps.length; j++) {
                    var prop = arrProps[j];
                    objProps[prop] = "";
                }
                
                node = extend(objProps, node);
            }
            
            if (t.Tabs) {
                
                var arrTabs = t.Tabs.split(',');
                for (j = 0; j < arrTabs.length; j++) {
                    var tab = arrTabs[j].trim();
                    
                    if (node.temp.tabs.indexOf(tab) === -1) {
                        node.temp.tabs.push(tab);
                    }
                }

     
            }
        }

    }

    return node;

}
,
//adds temp object with a set of utility properties derived from labels (isPicture etc)
//if n is an image it adds image properties
//adds properties and tabs that are defined by the node's labels
 addProps: function (n) {
    
    n.temp = {};
    n.temp.isPicture = n.labels.indexOf('Picture') > -1;
    n.temp.isImage = n.labels.indexOf('Image') > -1;
    n.temp.isGroup = n.labels.indexOf('Group') > -1;
    n.temp.isFavourite = n.labels.indexOf('Favourite') > -1;
    n.temp.isUser = n.labels.indexOf('User') > -1;
    n.temp.isGlobal = n.labels.indexOf('Global') > -1;
    //  n.temp.UnCached = n.labels.indexOf('UnCached') > -1;
    
    if (n.temp.isPicture) {
        that.addImageProps(n);
    }
    
    return that.setPropsAndTabsFromLabels(n);

}
,

 addImageProps : function (node) {
    
    var contentRoot = config.media.root;
    
    node.temp = node.temp || {};
    var thumbWidth = 236;//180;
    
    if (node.ImageUrl || node.ImageCache) {
        
        node.temp.thumbHeight = parseInt(thumbWidth / (node.ImageWidth / node.ImageHeight));
        node.temp.thumbWidth = thumbWidth;
        
        if (!node.ImageCache) {
            node.temp.thumbUrl = node.ImageThumb;
            node.temp.imageUrl = node.ImageUrl;

        }
        else {
            node.temp.thumbUrl = contentRoot + "thumbnail/" + node.ImageCache.replace(/ /g, '%20');
            node.temp.imageUrl = contentRoot + "original/" + node.ImageCache.replace(/ /g, '%20');
        }
        
        var isUpload = node.ImageCache && node.ImageCache.indexOf("upload/") === 0;
        
        if (isUpload) {
            
            node.temp.imageSource = {
                name: node.ImageCache.replace("upload/", "").substring(0, node.ImageCache.replace("upload/", "").indexOf("/")),
                ref: undefined//add link to user page
            };

        }
        else {
            
            node.temp.imageSource = {
                name: node.ImageSite ,
                ref: node.ImageRef || "http://" + node.ImageSite,
                url: node.ImageUrl
            };
        }

    }
    
    return node;
}
,
addPropsAndTrim : function (node) {
    
    //would be more efficient to select just the props you need in the query
    
    that.addImageProps(node);
    
    for (var prop in node) {
        //note Image props are removed here as they are transformed into temp object for consumption by client
        if (prop.indexOf("FB_") === 0 || prop.indexOf("Wiki") === 0 || prop.indexOf("Image") === 0 || prop.indexOf("Gallery") === 0 || prop === "Text") {
            delete node[prop];
        }
        
        delete node.ArtistRef;
        delete node.temp.imageSource;
        delete node.Description;//can remove if decide to keep for display on client



    }
    
    node.temp.trimmed = true;
    return node;

}

,
//returns a new property object for the node
//--removes any empty propertes
//--removes id property as this is internal to neo4j
//--removes labels property as this is persisted with labels in neo4j
//--remove temp property as this data should not be persisted
propsForSave : function (n) {
    
    var props = JSON.parse(JSON.stringify(n)); //angular.copy(n);
    
    //remove any empty properties
    for (var p in props) {
        if (props[p] === null || props[p] === undefined || props[p] === "") {
            delete props[p];
        }
    }
    delete props.labels;
    delete props.id;
    delete props.temp;
    
    return props;

}

};


return that;


    
    
};

