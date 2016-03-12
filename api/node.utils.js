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
    
 setPropsAndTabsFromLabels : function (n) {
    
    var node = JSON.parse(JSON.stringify(n));// angular.copy(n);
    
    node.temp.tabs = ["Properties"];// defaultTabs;
    
    //add empty props to node according to labels
    //the data about which props / tabs to add is stored against  types in type.getList()
    var i,j;
    
    for (i = 0; i < node.labels.length; i++) {
        
        var label = node.labels[i];
        
        if (type.getList()[label]) {
            
            var t = type.getList()[label];//retrieve the type from the label text
            
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
    
    var props = {};
    
    for (var key in n)
    {
        if (n[key] !== null && n[key] !== undefined && n[key] !== "" &&
         key !== "labels" && key !== "id" && key !== "temp")
         {
             props[changeCase.pascalCase(key)] = n[key];
         }
    }
    /*
    
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
    */
    
    return props;

}
  ,
    //labels is an array
    //returns properties and tabs aggregated for the labels passed in
    getPropsFromLabels: function (labels) {
        
        var props = {};
        var tabs = ["Properties"];

        for (var i = 0; i < labels.length; i++) {
            
            var label = labels[i];
            
            if (type.getList()[label]) {
                
                var t = type.getList()[label];//retrieve the type from the label text
                
                if (t.Props) {
                    
                    var arrProps = t.Props.split(',');
                    
                    for (let j = 0; j < arrProps.length; j++) {
                        var prop = arrProps[j];
                        props[prop] = "";
                    }
                }
                
                if (t.Tabs) {
                    
                    var arrTabs = t.Tabs.split(',');
                    for (let j = 0; j < arrTabs.length; j++) {
                        var tab = arrTabs[j].trim();
                        
                        if (tabs.indexOf(tab) === -1) {
                            tabs.push(tab);
                        }
                    }

     
                }
                
            
            }

        }
        
        return {
            properties: props,
            tabs: tabs
        };

    }
    ,
    //Builds a temp.relProps object and adds it to the node (n)
    //Relationships are aggregated by [predicate + direction ('->' or '-<')] which form the object keys
    addRelProps: function (n) {
    
    //format relationships as props - grouped by predicate
    //formed like this:
    //{
    // "PropDescription":{
    //     predicate,
    //    items: array of {id:,Lookup:} in this relationship
    // }
    // }
    
    var statements = [];
    
    //out rels
    statements.push(cypher.buildStatement("match (n) - [r] -> (m:Label)  where  ID(n) = " + n.id + " return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label", "row"));
    //in
    statements.push(cypher.buildStatement("match (n) <- [r] - (m:Label)  where ID(n) = " + n.id + "   and NOT(n <-[:BY]-(m))    return ID(m), m.Lookup,m.Type,ID(r),TYPE(r),m.Label", "row"));
    //links
    statements.push(cypher.buildStatement("match (n) - [r:LINK] - (m:Link)  where ID(n) = " + n.id + "      return ID(m), m.Name,m.Url", "row"));
    
    
    return cypher.executeStatements(statements).then(function (results) {
        
        n.temp = n.temp || {};
        n.temp.images = n.temp.images || [];
        
        var outRels = results[0].data;
        var inRels = results[1].data;
        var links = results[2].data;
        
        n.temp.relProps = {};
        //out
     
        var i;
     
        
        for (i = 0; i < outRels.length; i++) {
            
            let p = predicate.get(outRels[i].row[4]).setDirection("out");
            let key = p.toString();
            let item = {
                id: outRels[i].row[0],
                Lookup: outRels[i].row[1],
                Type: outRels[i].row[2],
                Label: outRels[i].row[5]
            };
            
            if (!n.temp.relProps[key]) {
                n.temp.relProps[key] = {
                    predicate: p, 
                    items: [item]
                };
            }
            else {
                n.temp.relProps[key].items.push(item);
            }
        
        }
        
        
        //in
        
        for (i = 0; i < inRels.length; i++) {
            let p = predicate.get(inRels[i].row[4]).setDirection("in");
            let key = p.toString();
            let item = {
                id: inRels[i].row[0],
                Lookup: inRels[i].row[1],
                Type: inRels[i].row[2],
                Label: inRels[i].row[5]
            };
            
            if (!n.temp.relProps[key]) {
                n.temp.relProps[key] = {
                    predicate: p, 
                    items: [item]
                };
            }
            else {
                n.temp.relProps[key].items.push(item);
            }

        }

        //webpage links
        n.temp.links = [];
        for (i = 0; i < links.length; i++) {
            n.temp.links.push({
                Name: links[i].row[1], 
                Url: links[i].row[2]
            });
        }

        return n;
    });

}
,
//adds a property temp.labelled to the node 
//which contains an array of the nodes labelled with this node's Label property
 addLabelled: function (n) {
    
    var statements = [];
    
    statements.push(cypher.buildStatement("match (n:Label:" + n.Label + ") return ID(n),n.Lookup,n.Type,n.Label", "row"));
    
    return cypher.executeStatements(statements).then(function (results) {
        
        n.temp.labelled = [];
        
        var out = results[0].data;
        
        if (out.length > 50) {
            n.temp.labelledOverflow = true;
        }
        else {
            
            for (var i = 0; i < out.length; i++) {
                
                var item = {
                    id: out[i].row[0],
                    Lookup: out[i].row[1],
                    Type: out[i].row[2],
                    Label: out[i].row[3]
                };
                
                n.temp.labelled.push(item);

            }
        }
        
        return n;
    });

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

