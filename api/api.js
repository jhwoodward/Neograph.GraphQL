"use strict";

var cypher = require("./cypher");
var utils = require("./utils");
var extend = require('extend');
var config = require('../config');
/**
 * Checks if value is empty. Deep-checks arrays and objects
 * Note: isEmpty([]) == true, isEmpty({}) == true, isEmpty([{0:false},"",0]) == true, isEmpty({0:1}) == false
 * @param value
 * @returns {boolean}
 */
function isEmpty(value) {
    var isEmptyObject = function (a) {
        if (typeof a.length === 'undefined') { // it's an Object, not an Array
            var hasNonempty = Object.keys(a).some(function nonEmpty(element) {
                return !isEmpty(a[element]);
            });
            return hasNonempty ? false : isEmptyObject(Object.keys(a));
        }
        
        return !a.some(function nonEmpty(element) { // check if array is really not empty as JS thinks
            return !isEmpty(element); // at least one element should be non-empty
        });
    };
    return (
    value === false  || typeof value === 'undefined'  || value === null || (typeof value === 'object' && isEmptyObject(value))
);
}

var setPropsAndTabsFromLabels = function (n) {
    
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

};



var addProps = function (n) {
    
    n.temp = {};
    n.temp.isPicture = n.labels.indexOf('Picture') > -1;
    n.temp.isImage = n.labels.indexOf('Image') > -1;
    n.temp.isGroup = n.labels.indexOf('Group') > -1;
    n.temp.isFavourite = n.labels.indexOf('Favourite') > -1;
    n.temp.isUser = n.labels.indexOf('User') > -1;
    n.temp.isGlobal = n.labels.indexOf('Global') > -1;
    //  n.temp.UnCached = n.labels.indexOf('UnCached') > -1;
    
    if (n.temp.isPicture) {
        addImageProps(n);
    }
    
    return setPropsAndTabsFromLabels(n);

};

var addImageProps = function (node) {
    
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
};


var addPropsAndTrim = function (node) {
    
    //would be more efficient to select just the props you need in the query
    
    addImageProps(node);
    
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

};

var buildGraphObject = function (data, returnArray) {
    
    var edges = {};
    var nodes = {};
    var nodeArray = [];
    var edgeArray = [];
    
    for (var i = 0; i < data.length; i++) {
        
        var val = data[i];
        
        for (var relx = 0; relx < val.graph.relationships.length; relx++) {
            var rel = val.graph.relationships[relx];
            edges[rel.id] = rel;
            edgeArray.push(rel);
        }
        
        for (var nodex = 0; nodex < val.graph.nodes.length; nodex++) {
            var node = val.graph.nodes[nodex];
            var n = node.properties;
            n.labels = node.labels;
            n.id = node.id;
            n = addPropsAndTrim(n);
            nodes[node.id] = n;
            nodeArray.push(n);
        }
    
    }
    
    if (returnArray) {
        return { nodes: nodeArray, edges: edgeArray };
    }
    else {
        return { nodes: nodes, edges: edges };
    }
  
    

};

//returns graph data object for given query(q), with properties nodes, edges containing neo node/edge data by property=id
//node structure is {id:1,labels:[],properties:{}}
//edge structure is 
var getGraph = function (q, returnArray) {
    
    return cypher.executeQuery(q, "graph").then(function (data) {
        return buildGraphObject(data, returnArray);
    });

};


var propsForSave = function (n) {
    
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

};


var getNode = function (match, where) {
    
    return cypher.executeQuery("match (" + match + ") where " + where + " return ID(n),n,LABELS(n) ", "row").then(function (data) {
        if (data.length) {
            var n = data[0].row[1];
            n.id = data[0].row[0];
            n.labels = data[0].row[2];
            
            
            return addProps(n);
        }
        else {
            
            return null;
        }

    });
};

var getNodeById = function (id, addrelprops) {
    
    return getNode("n", " ID(n)=" + id).then(function (node) {
        if (addrelprops) {
            return addRelProps(node).then(function (out) {
                
                
                return addLabelled(out);
            
            });
        }
        else {
            return node;
        }
    });
};



var addRelProps = function (n) {
    
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
            
            let predicate = new utils.Predicate(outRels[i].row[4], "out");
            let k = predicate.Key();
            let item = {
                id: outRels[i].row[0],
                Lookup: outRels[i].row[1],
                Type: outRels[i].row[2],
                Label: outRels[i].row[5]
            };
            
            if (!n.temp.relProps[k]) {
                n.temp.relProps[k] = {
                    predicate: predicate, 
                    items: [item]
                };
            }
            else {
                n.temp.relProps[k].items.push(item);
            }
        
        }
        
        
        //in
        
        for (i = 0; i < inRels.length; i++) {
            let predicate = new utils.Predicate(inRels[i].row[4], "in");
            let k = predicate.Key();
            let item = {
                id: inRels[i].row[0],
                Lookup: inRels[i].row[1],
                Type: inRels[i].row[2],
                Label: inRels[i].row[5]
            };
            
            if (!n.temp.relProps[k]) {
                n.temp.relProps[k] = {
                    predicate: predicate, 
                    items: [item]
                };
            }
            else {
                n.temp.relProps[k].items.push(item);
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

};


var addLabelled = function (n) {
    
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

};

var getImages = function (id, isPicture, isGroup) {
    
    var statements = [];
    //pictures  / images
    if (isPicture) { //if picture return images (these are other - usually less good - images of the same picture)
        statements.push(cypher.buildStatement("match (n) - [r] - (m:Image)  where ID(n) = " + id + "  return ID(m), m,type(r) order by m.Status DESC limit 50 ", "graph"));
    }
    else if (isGroup) {//todo:also return images linked /tagged directly
        statements.push(cypher.buildStatement("MATCH (p:Label) - [:ASSOCIATED_WITH|:PART_OF|:FOUNDS|:LEADS|:MEMBER_OF|:REPRESENTS] - (g:Group), (p) -- (i:Picture) where ID(g) = " + id + " return p.Name,collect(i)[0..5],count(*) as count order by p.Name", "graph"));
    }
    else {
        statements.push(cypher.buildStatement("match (n) - [r] - (m:Picture)  where ID(n) = " + id + "  return ID(m), m,type(r) order by m.Status DESC limit 50 ", "graph"));
    }
    
    return cypher.executeStatements(statements).then(function (results) {
        
        return buildGraphObject(results[0].data, true).nodes;

    });

};

var that = {
    painters : function (req, res) {
        
        let i = 123/0;
        
        var query = "MATCH (n:Painter) RETURN n, labels(n) as l LIMIT {limit}";
        var params = { limit: 10 };
        
        cypher.executeQuery(query, "graph", params).then(function (data) {
            res.status(200).json(data);
        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });



        
        //cypher.executeQuery2(query, "graph", params, 
        //    function (err,data) { 
        
        //    console.log(data);
        //    res.status(200).json(data);
        
        //});

    }
    ,
    init: function () {
        
        
        
        return that;

    }
    ,
    getImages : function (req, res) {
        
        var isPicture = req.body.isPicture;
        var isGroup = req.body.isGroup;
        var id = req.body.id;
        
        if (isPicture === undefined || isGroup === undefined) {
            
            getNodeById(id).then(function (node) {
                
                getImages(node.id, node.temp.isPicture, node.temp.isGroup).then(function (out) {
                    
                    res.status(200).json(out);
                
                });
            
            });
        
        }
        else {
            
            getImages(id, isPicture, isGroup).then(function (out) {
                
                res.status(200).json(out);
                
            });
        
        
        }

     

    }
    ,
    getPropsFromLabels: function (req, res) {
        
        var props = {};
        var tabs = ["Properties"];
        for (var i = 0; i < req.body.labels.length; i++) {
            
            var label = req.body.labels[i];
            
            if (utils.types[label]) {
                
                var t = utils.types[label];//retrieve the type from the label text
                
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
        
        res.status(200).json({
            properties: props,
            tabs: tabs
        });

    }
    
    ,
    testGraph: function (req, res) {
        
        var q = "MATCH(c:Global:American) - [r] - (d:Global) where  not (c-[:TYPE_OF]-d) and not d.Lookup='American' and not c.Lookup='American'  return c,d,r";
        
        getGraph(q).then(function (data) {
            res.status(200).json(data);
        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });
    
    }
    ,
    //post
    //q = graph query
    graph: function (req, res) {
        
        getGraph(req.body.q, req.body.returnArray).then(function (data) {
            res.status(200).json(data);
        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });
    
    }
    //,
    ////returns all relationships between supplied nodes, which can be vis.Dataset or graph data object
    //getAllRelationships: function (nodes) {
    //    var nodeIds = "";
    
    //    if (nodes.getIds) //if vis.DataSet
    //    {
    //        nodeIds = nodes.getIds({ returnType: 'Array' }).join(",");
    //    }
    //    else { //otherwise data object
    
    //        for (var key in nodes) {
    //            if (nodeIds.length) {
    //                nodeIds += ",";
    //            }
    //            nodeIds += key;
    //        }
    //    }
    
    //    var q = "MATCH a -[r]- b WHERE id(a) IN[" + nodeIds + "] and id(b) IN[" + nodeIds + "] and not (a-[:TYPE_OF]-b) return r";
    
    //    return neoClient.graph.get({ q: q });//getGraph(q);
    
    //}
    ,
    getNode: function (req, res) {
        
        return getNode("n", " ID(n)=" + req.params.id).then(function (data) {
            res.status(200).json(data);
        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });
    }
    ,
    getRelationships: function (req, res) {
        var id = req.params.id;
        var q = "match (n)-[r]-(m:Global) where ID(n)=" + id + " return r";
        getGraph(q).then(function (data) {
            res.status(200).json(data);
        });
    }
    ,
    getNodeWithRels: function (req, res) {
        
        return getNode("n", " ID(n)=" + req.params.id).then(function (data) {
            
            addRelProps(data).then(function (out) {
                
                out = setPropsAndTabsFromLabels(out);
                
                addLabelled(out).then(function (n) {
                    
                    res.status(200).json(n);

                });
                
               


            }).catch(function (err) {
                //log the error ?
                res.status(500).json(err);
            });


         

        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });

    
    }
    ,
    getNodeByLabel: function (req, res) {
        
        return getNode("n:Label", "n.Label = '" + req.params.label + "'").then(function (data) {
            res.status(200).json(data);
        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });

    }
    ,
    getNodeWithRelsByLabel: function (req, res) {
        
        return getNode("n:Label", "n.Label = '" + req.params.label + "'").then(function (data) {
            
            if (data) {
                addRelProps(data).then(function (out) {
                    
                    out = setPropsAndTabsFromLabels(out);
                    
                    addLabelled(out).then(function (n) {
                        
                        res.status(200).json(n);

                    });


                }).catch(function (err) {
                    //log the error ?
                    res.status(500).json(err);
                });
            }
            else {
                
                res.status(204);
            }

          
        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });

    }
    ,
    //post
    //q = match (n) & where only (without return)
    nodeList: function (req, res) {
        
        let q = req.body.q;
        let limit = req.body.limit;
        
        q += "  return ID(n),n,LABELS(n) ";
        if (limit) {
            q += " limit " + limit;
        }
        
        cypher.executeQuery(q, "row").then(function (data) {
            
            
            var out = data.map(function (item) {
                var n = data[0].row[1];
                n.id = data[0].row[0];
                n.labels = data[0].row[2];
                return addProps(n);

            });
            
            res.status(200).json(out);

        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });


    }
    ,
    saveWikipagename: function (req, res)//short version for freebase prop saving
    {
        var id = req.body.id;
        var name = req.body.name;
        
        var statements = [];
        statements.push(cypher.buildStatement("match(n) where ID(n)=" + id + "  set n.Wikipagename={page} return n", "row", { "page": name }));
        
        cypher.executeStatements(statements).then(function (results) {
            
            res.status(200).json(results[0].data[0].row[0]);

        }).catch(function (err) {
            //log the error ?
            res.status(500).json(err);
        });
    }
    ,
    saveMetadata: function (d) //for saving metadata from wga scrape
    {
        
        //        d = {
        //            imageUrl: imgurl,
        //            title: clean(metadatabits[0].replace("<b>", "").replace("</b>", "")),
        //            date: clean(metadatabits[1]),
        //            type: clean(metadatabits[2].split(",")[0]),
        //            dimensions: clean(metadatabits[2].split(",")[1]),
        //            collection: clean(metadatabits[3]),
        //            text: $($tr.find('td')[1]).text().replace(/\r?\n|\r/, ""),//get rid of first linebreak only
        //            page: itempageurl
        //        }
        //        or
        //      d = {
        //        imageUrl: imgurl,
        //        text: $($tr.find('td')[1]).text().replace(/\r?\n|\r/, ""),//get rid of first linebreak only
        //page: itempageurl
        //      }
        var statements = [];
        
        var q = d.imageUrl ? "match(n:Wga {ImageUrl:{imageUrl}}) " : "match(n:Olga {ImageCache:{imageCache}}) ";//NB POOR ASSUMPTION !
        
        if (d.page) {
            
            q += " set  n.ImageRef={page}";
            
            if (d.title) {
                q += ",n.Title={title}";
            }
            if (d.date) {
                q += ",n.Date={date}";
            }
            if (d.type) {
                q += ",n.Medium={type}";
            }
            if (d.dimensions) {
                q += ",n.Dimensions={dimensions}";
            }
            if (d.collection) {
                q += ",n.Collection={collection}";
            }
            if (d.metadata) {
                q += ",n.Metadata={metadata}";
            }
            
            q += "  return n.ImageRef";
            let s = cypher.buildStatement(q, "row", d);
            statements.push(s);

        }
        else {
            
            q += " set  n:NoRef";

        }
        
        let s = cypher.buildStatement(q, "row", d);
        statements.push(s);
        
        return cypher.executeStatements(statements);
            //.then(function (results) {

            //    return results[0].data[0].row[0];

            //});



    }
    ,
    saveProps: function (n)//short version for freebase prop saving
    {
        var statements = [];
        var props = propsForSave(n);
        
        
        statements.push(cypher.buildStatement("match(n) where ID(n)=" + n.id + "  set n= {props} return ID(n)", "row", { "props": props }));
        
        return cypher.executeStatements(statements).then(function (results) {
            
            return results[0].data[0].row[0];

        });
    }
    ,
    //TODO: 
    //for labels (types), type hierachy needs to be enforced - eg if Painter then add Person:Global,-----------------DONE
    //if Painting the add Picture:Creation. These will need to be kept updated.
    //when Lookup is updated, the corresponding label needs to be renamed MATCH (n:OLD_LABEL)  REMOVE n:OLD_LABEL SET n:NEW_LABEL--------------- DONE
    //when updating Type, label needs to be updated, when creating----------------------DONE
    //When we come to modifying labels on creations, their relationships will need to be kept updated
    saveNode: function (req, res) {
        
        //do i need to json.parse ?
        var n = req.body.node;
        var user = req.body.user;
        
        if (n.temp.trimmed) {
            throw ("Node is trimmed - cannot save");
        }
        
        
        var props = propsForSave(n);
        
        if (n.id > -1) { //update
            
            
            var arrLabelsToRemove
                ,arrLabelsToAdd
                ,arrLabelledToRemove
                ,arrLabelledToAdd
                ,statements = [];
            
            
            //check existing node
            getNodeById(n.id, true)//now need to load relationships for comparison (,true)
                    .then(function (existing) {
                
                utils.setLabelParents(n);
                
                arrLabelsToRemove = existing.labels.diff(n.labels);
                arrLabelsToAdd = n.labels.diff(existing.labels);
                
                if (arrLabelsToAdd.length || arrLabelsToRemove.length) {
                    var sAddLabels = "";
                    if (arrLabelsToAdd.length) {
                        sAddLabels = " set n:" + arrLabelsToAdd.join(":");
                    }
                    
                    var sRemoveLabels = "";
                    if (arrLabelsToRemove.length) {
                        sRemoveLabels = " remove n:" + arrLabelsToRemove.join(":");
                    }
                    statements.push({ statement: "match(n) where ID(n)=" + n.id + sRemoveLabels + sAddLabels });
                }
                
                //update item labels if changing Label property
                if (existing.Label && existing.Label != n.Label) {
                    statements.push({ statement: "match(n:" + existing.Label + ") remove n:" + existing.Label + " set n:" + n.Label });
                }
                
                statements.push(cypher.buildStatement("match(n) where ID(n)=" + n.id + "  set n= {props} return ID(n),n,LABELS(n) ", "row", { "props": props }));
                
                
                //update labelled
                //can only do this if < 50 items labelled or request gets too large
                if (!n.temp.labelledOverflow) {
                    var arrLabelled = n.temp.labelled.map(function (i) { return i.id; });
                    var arrExistingLabelled = existing.temp.labelled.map(function (i) { return i.id; });
                    arrLabelledToRemove = arrExistingLabelled.diff(arrLabelled);
                    arrLabelledToAdd = arrLabelled.diff(arrExistingLabelled);
                    if (arrLabelledToAdd.length) {
                        statements.push({ statement: "match(n:Label) where ID(n) in [" + arrLabelledToAdd.join(",") + "] set n:" + props.Label });
                    }
                    if (arrLabelledToRemove.length) {
                        statements.push({ statement: "match(n:Label) where ID(n) in [" + arrLabelledToRemove.join(",") + "] remove n:" + props.Label });
                    }
                }
                
                cypher.executeStatements(statements).then(function (results) {
                    
                    var nodeData = results[statements.length - 1].data[0].row;
                    var saved = nodeData[1];
                    saved.id = nodeData[0];
                    saved.labels = nodeData[2];
                    
                    
                    statements = [];
                    
                    for (let relProp in n.temp.relProps) {
                        let rel = n.temp.relProps[relProp];
                        let existingRel = existing.temp.relProps[relProp];
                        if (!existingRel) {
                            rel.itemsToRemove = [];
                            rel.itemsToAdd = rel.items;
                        }
                        else {
                            rel.itemsToRemove = existingRel.items.ids().diff(rel.items.ids()).map(function (e) { return { id: e }; });
                            rel.itemsToAdd = rel.items.ids().diff(existingRel.items.ids()).map(function (e) { return { id: e }; });
                        }
                        
                        for (let i = 0; i < rel.itemsToAdd.length; i++) {
                            let e = rel.itemsToAdd[i];
                            if (rel.predicate.Direction === "out") {
                                statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.Lookup + "] -> (m)"));
                            }
                            else {
                                statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.Lookup + "] -> (n)"));
                            }
                        }
                        
                        for (let i = 0; i < rel.itemsToRemove.length; i++) {
                            let e = rel.itemsToRemove[i];
                            if (rel.predicate.Direction === "out") {
                                statements.push(cypher.buildStatement("match (n) - [r:" + rel.predicate.Lookup + "] -> (m) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                            }
                            else {
                                statements.push(cypher.buildStatement("match (m) - [r:" + rel.predicate.Lookup + "] -> (n) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                            }
                        }
                    }
                    
                    for (let relProp in existing.temp.relProps) {
                        let rel = n.temp.relProps[relProp];
                        let existingRel = existing.temp.relProps[relProp];
                        if (!rel) {
                            for (var i = 0; i < existingRel.items.length; i++) {
                                var e = existingRel.items[i];
                                if (existingRel.predicate.Direction === "out") {
                                    statements.push(cypher.buildStatement("match (n) - [r:" + existingRel.predicate.Lookup + "] -> (m) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                                }
                                else {
                                    statements.push(cypher.buildStatement("match (m) - [r:" + existingRel.predicate.Lookup + "] -> (n) where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  delete r"));
                                }
                            }
                        }
                    }
                    
                    
                 
                    //var linksToRemove = existing.temp.links.diff(n.temp.links);
                    //for (var i = 0; i < linksToRemove.length; i++) {
                    //    var e = linksToRemove[i];
                    //    statements.push(cypher.buildStatement("MATCH (n)- [r:LINK] -> (l) where ID(n)=" + n.id + " and l.Name={name} and l.Url={url} delete r,l ", "row", { name: e.name, url: e.url }));
                    //}

                    statements.push(cypher.buildStatement("MATCH (n)- [r:LINK] -> (l:Link) where ID(n)=" + n.id + "  delete r,l ", "row"));
                    for (let i = 0; i < n.temp.links.length; i++) {
                        let e = n.temp.links[i];
                        if (e.editing) {
                            delete e.editing;
                        }
                        e.Type = "Link";
                        statements.push(cypher.buildStatement("create (l:Link:" + n.Label  + "  {props}) with l MATCH (n) where ID(n)=" + n.id + " create (n) - [r:LINK] -> (l) ", "row", { props: e }));
                    }
                 
                    
                    
                    if (statements.length) {
                        
                        cypher.executeStatements(statements).then(function (results) {
                            var out = extend(true, n, addProps(saved));//might be more convincing to reload the relationships instead of merging existing object
                            res.status(200).json(out);

                        }).catch(function (err) {
                            res.status(500).json(err);
                        });

                    }
                    else {
                        var out = extend(true, n, addProps(saved));//might be more convincing to reload the relationships instead of merging existing object
                        res.status(200).json(out);
                    }
                  

                     



                    
                  
                });
            });


        }
        else {
            
            utils.setLabelParents(n);
            
            var q = "create (n:" + n.labels.join(":") + " {props}) with n set n.created=timestamp() ";
            
            //if user passed as second argument create a link to the user from this node
            if (user) {
                q += " with n  MATCH (u:User {Lookup:'" + user.Lookup + "'})  create (u) - [s:CREATED]->(n)";
            }
            q += " return ID(n),n,LABELS(n)  ";
            cypher.executeQuery(q, "row", { "props": props }).then(function (data) {
                
                
                var saved = data[0].row[1];
                saved.id = data[0].row[0];
                saved.labels = data[0].row[2];
                
                
                //create relationships
                var statements = [];
                for (let prop in n.temp.relProps) {
                    let rel = n.temp.relProps[prop];
                    
                    if (rel.predicate.Direction === "out") {
                        
                        for (let i = 0; i < rel.items.length; i++) {
                            let e = rel.items[i];
                            statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.Lookup + "] -> (m)"));
                        }
                    }
                    else {
                        for (let i = 0; i < rel.items.length; i++) {
                            let e = rel.items[i];
                            statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.Lookup + "] -> (n)"));
                        }
                    }
                }

                for (let i = 0; i < n.temp.links.length; i++) {
                    let e = n.temp.links[i];
                    if (e.editing) {
                        delete e.editing;
                    }
                    e.Type = "Link";
                    statements.push(cypher.buildStatement("create (l:Link {props}) with l MATCH (n) where ID(n)=" + n.id + " create (n) - [r:LINK] -> (l) ", "row", { props: e }));
                }

                if (statements.length) {
                    cypher.executeStatements(statements).then(function (results) {
                        
                        //return results[0].data[0].row[0];
                        
                        let out = addProps(saved).addRelProps();
                        
                        res.status(200).json(out);

                    }).catch(function (err) {
                        res.status(500).json(err);
                    });


                }
                else {
                    
                    res.status(200).json(addProps(saved));
                }



            });

        }



    }
   /* ,
    saveRels: function (req, res) {
        var n = req.body.node;
        
        //create relationships
        var statements = [];
        for (var prop in n.temp.relProps) {
            var rel = n.temp.relProps[prop];
            
            if (rel.predicate.Direction === "out") {
                $(rel.items).each(function (i, e) {
                    statements.push(cypher.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (n)-[r:" + rel.predicate.Lookup + "] -> (m)"));
                })

            }
            else {
                
                $(rel.items).each(function (i, e) {
                    statements.push(neo.buildStatement("match n,m where ID(n)=" + saved.id + " and ID(m)=" + e.id + "  create (m)-[r:" + rel.predicate.Lookup + "] -> (n)"));
                })
            }
        }
        
        $(n.temp.links).each(function (i, e) {
            if (e.editing) {
                delete e.editing;
            }
            e.Type = "Link";
            statements.push(neo.buildStatement("create (l:Link {props}) with l MATCH (n) where ID(n)=" + n.id + " create (n) - [r:LINK] -> (l) ", "row", { props: e }));

        });
        
        return neo.executeStatements(statements);
    }*/
    ,
    saveMultiple: function (req, res) {
        
        var multiple = req.body.multiple;
        
        var arrLabelsToRemove = multiple.originalLabels.diff(multiple.labels);
        var arrLabelsToAdd = multiple.labels.diff(multiple.originalLabels);
        
        console.log(multiple.originalLabels);
        console.log(multiple.labels);
        
        var nodeIDs = multiple.nodes.map(function (node) { return node.id; });
        
        var statements = [];
        
        if (arrLabelsToAdd.length || arrLabelsToRemove.length) {
            var sAddLabels = "";
            if (arrLabelsToAdd.length) {
                sAddLabels = " set n:" + arrLabelsToAdd.join(":");
            }
            
            var sRemoveLabels = "";
            if (arrLabelsToRemove.length) {
                sRemoveLabels = " remove n:" + arrLabelsToRemove.join(":");
            }
            statements.push({ statement: "match(n) where ID(n) IN [" + nodeIDs.join(',') + "]" + sRemoveLabels + sAddLabels });



        }
        
        if (statements.length) {
            cypher.executeStatements(statements).then(function (results) {
                
                console.log(results);
                
                res.status(200);

            });
        }



    }
    ,
    //saves edge to neo (update/create)
    //TODO: according to certain rules labels will need to be maintained when relationships are created. (update not required as we always delete and recreate when changing start/end nodes)
    //tag a with label b where:
    // a=person and b=provenance (eg painter from france)
    // a=person and n=group, period (eg painter part of les fauves / roccocco)
    // a=picture and b=non-person (eg picture by corot / of tree) - although typically this will be managed through labels directly (which will then in turn has to keep relationships up to date)
    saveEdge: function (req, res) {//startNode and endNode provide the full node objects for the edge
        
        var e = req.body.e;
        
        console.log('save edge');
        console.log(e);
        
        //remove any empty properties
        for (var p in e) {
            if (e[p] === null || e[p] === undefined || e[p] === "") {
                delete e[p];
            }
        }
        
        
        if (e.id) //update
        {
            
            let statements = [];
            statements.push(cypher.buildStatement("match (a)-[r]->(b) where ID(a) = " + e.start.id + " and ID(b)=" + e.end.id + " and ID(r)=" + e.id + " delete r"));
            statements.push(cypher.buildStatement("match(a),(b) where ID(a)=" + e.start.id + " and ID(b) = " + e.end.id + " create (a)-[r:" + e.type + " {props}]->(b) return r"
                                    , "graph"
                                    , { "props": e.properties }));
            
            
            
            return cypher.executeStatements(statements)
                    .then(function (results) {
                return buildGraphObject(results[0].data);
            });


        }
        else //new
        {
            var aIsPerson = e.start.labels.indexOf("Person") > -1;
            var bIsProvenance = e.end.labels.indexOf("Provenance") > -1;
            var bIsGroup = e.end.labels.indexOf("Group") > -1;
            var bIsPeriod = e.end.labels.indexOf("Period") > -1;
            
            var tagAwithB = ((aIsPerson && (bIsProvenance || bIsGroup || bIsPeriod)) && e.type != "INFLUENCES") || e.type === "TYPE_OF";
            
            let statements = [];
            
            if (tagAwithB) {
                statements.push(cypher.buildStatement("match(a) where ID(a)=" + e.start.id + " set a:" + e.end.Lookup));
            }
            
            statements.push(cypher.buildStatement("match(a),(b) where ID(a)=" + e.start.id + " and ID(b) = " + e.end.id + " create (a)-[r:" + e.type + " {props}]->(b) return r"
                    , "graph"
                    , { "props": e.properties }));
            
            console.log(statements);
            
            cypher.executeStatements(statements)
                    .then(function (results) {
                return res.status(200).json(buildGraphObject(results[statements.length - 1].data));
            }).catch(function (err) {
                res.status(500).json(err);
            });
        }
    }
    ,
    saveFavourite: function (req, res) {
        
        var user = req.body.user;
        var node = req.body.node;
        
        var statements = [];
        
        var s = "create (n:Favourite:" + user.Lookup + " {created:timestamp()}) ";
        s += "with n MATCH (b),(u:User {Lookup:'" + user.Lookup + "'}) where  ID(b) = " + node.id + " create (u) - [s:FAVOURITE]->(n)-[r:FAVOURITE]->(b)  return ID(r),ID(s)";
        
        
        statements.push(cypher.buildStatement(s, null, null, true));
        
        cypher.executeStatements(statements)
                .then(function (results) {
            console.log(results);
            
            res.status(200);

        });


    }
    
    ,
    destroyNode: function (req, res) {//deletes node and relationships forever
        
        var node = req.body.node;
        
        var q = "match (n) where ID(n)=" + node.id + "  OPTIONAL MATCH (n)-[r]-()  delete n,r";
        
        cypher.executeQuery(q).then(function (d) {
            
            res.status(200).json(node);

        });

    }
    ,
    //TODO: return something
    deleteNode: function (req, res) {
        
        var node = req.body.node;
        
        if (node && node.id) {
            //only supports 1 node at the mo
            var statements = [];
            
            
            //remove existing labels and add deleted label
            //  statements.push(cypher.buildStatement("match(n)  where ID(n)=" + node.id + "  remove n:" + node.labels.join(':') + " set n:Deleted,n.labels={labels},n.relationships={rels},n.deleted=timestamp()", "row", { "rels": rels, "labels": node.labels }, true));
            
            statements.push(cypher.buildStatement("match(n)  where ID(n)=" + node.id + "  remove n:" + node.labels.join(':') + " set n:Deleted,n.oldlabels={labels},n.deleted=timestamp()  return ID(n),n,LABELS(n)", "row", { "labels": node.labels }, true));
            
            
            cypher.executeStatements(statements).then(function (results) {
                
                var nodeData = results[0].data[0].row;
                var deleted = nodeData[1];
                deleted.id = nodeData[0];
                deleted.labels = nodeData[2];
                
                res.status(200).json(addProps(deleted));

            });


        }
        else { }//need to return a resolved promise


    }
    ,
    
    restoreNode: function (req, res) {
        
        var node = req.body.node;
        
        if (node && node.id) {
            //only supports 1 node at the mo
            var statements = [];
            
            
            //remove existing labels and add deleted label
            //  statements.push(cypher.buildStatement("match(n)  where ID(n)=" + node.id + "  remove n:" + node.labels.join(':') + " set n:Deleted,n.labels={labels},n.relationships={rels},n.deleted=timestamp()", "row", { "rels": rels, "labels": node.labels }, true));
            
            statements.push(cypher.buildStatement("match(n)  where ID(n)=" + node.id + "  set n:" + node.oldlabels.join(':') + " remove n:Deleted,n.deleted return ID(n),n,LABELS(n) ", "row", null, true));
            
            
            cypher.executeStatements(statements).then(function (results) {
                
                var nodeData = results[0].data[0].row;
                var saved = nodeData[1];
                saved.id = nodeData[0];
                saved.labels = nodeData[2];
                
                res.status(200).json(addProps(saved));

            });


        }
        else { }//need to return a resolved promise


    }
    ,
    deleteEdge: function (req, res) {
        
        var edge = req.body.edge;
        
        if (edge && edge.id) {
            
            var statements = [];
            
            //remove label that may be in place due to relationship
            statements.push(cypher.buildStatement("match (a) where ID(a) = " + edge.start.id + " remove a:" + edge.end.Lookup));
            statements.push(cypher.buildStatement("match (a)-[r]->(b) where ID(a) = " + edge.start.id + " and ID(b)=" + edge.end.id + " and ID(r)=" + edge.id + " delete r"));
            //     console.log(statements);
            cypher.executeStatements(statements)
                    .then(function (results) {
                
                res.status(200);
            });

        }

    }
    ,
    getUser: function (req, res) {
        
        var userLookup = req.params.user;
        
        var statements = [];
        
        statements.push(cypher.buildStatement("match (n:User {Lookup:'" + userLookup + "'}) return n", "row"));
        statements.push(cypher.buildStatement("match (n:User {Lookup:'" + userLookup + "'}) - [r:FAVOURITE] - (f:Favourite) - [] -> (item) return ID(item)", "row"));
        
        
        cypher.executeStatements(statements).then(function (results) {
            //    console.log(results);
            var user = results[0].data[0].row[0];
            user.favourites = {};
            
            for (var i = 0; i < results[1].data.length; i++) {
                
                var fav = results[1].data[i];
                var favNodeId = fav.row[0];
                user.favourites[favNodeId] = { id: favNodeId };
            }
            
            //angular.forEach(results[1].data, function (fav) {
            //    var favNodeId = fav.row[0];
            //    user.favourites[favNodeId] = { id: favNodeId };
            
            //});
            
            res.status(200).json(user);

        });

    }
    ,
    
    //generic method to query neo
    //shouldnt be exposed
    //getData: function (q) {
    
    //    return cypher.executeQuery(q, "row").then(function (data) {
    //        console.log(data);
    
    
    //        return data.map(function (d) {
    
    //            return d.row;
    
    //        });
    
    //    });
    
    //},
    
    //returns array of nodes with id and lookup only
    //dont want to have methods which allow direct query
    getOne: function (req, res) {//q must be a match return a single entity n
        
        let q = req.body.q + " return ID(n),n.Lookup";
        
        console.log(q);
        
        cypher.executeQuery(q, "row").then(function (data) {
            console.log(data);
            
            
            var out = data.map(function (d) {
                
                return {
                    id: d.row[0],
                    Lookup: d.row[1]
                };

            })[0];
            
            res.status(200).json(out);

        });


    }
    ,
    matchNodes: function (req, res) { //restrict = labels to restrict matches to
        
        var txt = req.body.txt;
        var restrict = req.body.restrict;
        
        if (txt) {
            var q;
            if (restrict == "User") {
                q = "match (n:User) where n.Lookup =~ '(?i).*" + txt + ".*' return ID(n),n.Lookup,n.Type,n.Label ";
            }
            else if (restrict == "Label") {
                q = "match (n:Label) where n.Lookup =~ '(?i).*" + txt + ".*'  return ID(n),n.Lookup,n.Type,n.Label ";
            }
            else {//include predicates
                q = "match (n:Label) where n.Lookup =~ '(?i).*" + txt + ".*'  return ID(n),n.Lookup,n.Type,n.Label ";
                q += " union all match (n:Predicate) where n.Lookup =~ '(?i).*" + txt + ".*' return ID(n),n.Lookup,n.Type,n.Label";
            }
            
            cypher.executeQuery(q, "row").then(function (data) {
                
                
                var out = data.map(function (d) {
                    
                    return {
                        id: d.row[0],
                        Lookup: d.row[1],
                        Type: d.row[2],
                        Label: d.row[3]
                    };

                });
                
                res.status(200).json(out);




            });

        }

    }
    
    
    ,
    getImageRelationships: function (req, res) { //loks up id/label first then call get by label
        
        var edge = req.body.edge;
        
        //TODO: NEEDS UPDATING SINCE CHANGE FROM IMAGEPATH TO IMAGEURL
        var q = "match (n) - [r] - (c1) - [r2] - (c2) - [r3] - (m) where (c1:Painting or c1:Drawing) and (c2:Painting or c2:Drawing)  and ID(n) = " + edge.startNode + " and ID(m) = " + edge.endNode + "  return c1,labels(c1),c2,labels(c2) limit 50";//type(r)
        
        cypher.executeQuery(q).then(function (data) {
            
            var out = data.map(function (val) {
                
                var from = val.row[0];
                from.temp = {
                 //   thumbUrl: getThumbnailUrl(from.ImagePath)
                };
                
                from.labels = val.row[1];
                
                var to = val.row[2];
                to.temp = {
                 //   thumbUrl: getThumbnailUrl(to.ImagePath)
                };
                
                to.labels = val.row[3];
                
                return {
                    from: from,
                    to: to
                };

            });
            
            res.status(200).json(out);

        });

    }
    
    ,
    //Alternatively i could query the actual labels and merge them into a distinct array
    distinctLabels: function (req, res) {
        var q;
        var labels = req.body.labels;
        if (labels) {
            q = "match (n:" + labels.join(':') + ") return distinct(LABELS(n))";
        }
        else {
            
            q = req.body.q;
        
        }
        cypher.executeQuery(q).then(function (data) {
            
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
            
            res.status(200).json(output);
        });

    }
 


};


module.exports = that.init();

