module.exports = function(config)
{

var cypher = require("./cypher")(config);
var extend = require('extend');

Array.prototype.diff = function (a) {
    return this.filter(function (i) { return a.indexOf(i) < 0; });
};

Array.prototype.ids = function () {
    return this.map(function (e) { return e.id; });
};

Array.prototype.hasAny = function (a) {
    return this.filter(function (i) { return a.indexOf(i) > -1; }).length > 0;
};

Array.prototype.unique = function () {
    var a = [];
    for (i = 0; i < this.length; i++) {
        var current = this[i];
        if (a.indexOf(current) < 0) a.push(current);
    }
    return a;
};
//var sources = {
//    "1": { name: "Wikimedia Commons", url: "http://commons.wikimedia.org/wiki/Main_Page", directLinkStub: "http://upload.wikimedia.org/wikipedia/commons/" },
//    "2": { name: "Web Gallery of Art", url: "http://www.wga.hu/index1.html", directLinkStub: "http://www.wga.hu/art/" },
//    "3": { name: "Olga's Gallery", url: "http://www.abcgallery.com" },
//    "5": { name: "Matisse Picasso Gallery", url: "http://www.picassoandmatisse.com" },
//    "6": { name: "Renoir Gallery", url: "http://www.renoirgallery.com/" },
//    "7": { name: "Google", url: "http://www.google.co.uk" },
//    "8": { name: "Hirshhorn", url: "http://hirshhorn.si.edu" },
//    "9": { name: "Artchive", url: "http://www.artchive.com" },
//    "10": { name: "Libart", url: "http://www.lib-art.com" },
//    "11": { name: "Marlborough Fine Art", url: "http://www.marlboroughfineart.com" },
//    "12": { name: "Visual telling of Stories", url: "http://www.fulltable.com/vts", directLinkStub: "http://www.fulltable.com/vts/" },
//    "13": { name: "User upload" }
//}

//  var contentRoot = 'http://julian-pc/media/';
// var contentRoot = 'http://82.145.57.222/media/';

//image properties:
//ImageUrl - the original source URL (formerly ImagePath)
//ImageCache - the path to the cached image (relative to /original/ or /thumbnail/)
//ImageRef - the url of the page the image was found on
//ImageSite - the domain (site) name the image was found on (could be derived from ImageRef)
//ImageWidth
//ImageHeight - the image dimensions - might be the thumb dimensions but primarily use to determin aspect ratio
//ImageZoomLink - the link to the zoomable image if available (national gallery, artsy)
//ImageThumb - the url or base64 encoded thumbnail url at time of capture. Only for precache usage
//GoogleData - serialized data from google search

//TateID - the tate ID of the item

var Predicate = function (lookup, direction) {
    this.Lookup = lookup;
    
    this.IsDirectional = this.Lookup != "ASSOCIATED_WITH";
    
    this.Direction = direction;
    
    this.Type = 'Predicate';
    
    this.Key = function () {
        
        if (!this.IsDirectional || !this.Direction) {
            return this.Lookup;
        }
        else if (this.Direction == "out") {
            return this.Lookup + " ->";
        }
        else {
            return this.Lookup + " <-";
        }
    };
    
    this.ToString = function () {
        
        if (!this.IsDirectional || !this.Direction || this.Direction == "out") {
            return this.Lookup.replace(/_/g, ' ').toLowerCase();
        }
        else {
            
            if (this.Lookup == "CREATED")
                return "created by";
            else if (this.Lookup == "INFLUENCES")
                return "influenced by";
            else if (this.Lookup == "INSPIRES")
                return "inspired by";
            else if (this.Lookup == "ANTICIPATES")
                return "anticipated by";
            else if (this.Lookup == "DEVELOPS")
                return "developed by";
            else if (this.Lookup == "DEPICTS")
                return "depicted by";
            else if (this.Lookup == "TYPE_OF")
                return "type(s)";
            else
                return "(" + this.Lookup.replace(/_/g, ' ').toLowerCase() + ")";

        }

    };
    
    this.Reverse = function () {
        
        if (!this.IsDirectional) {
            return;
        }
        
        if (this.Direction === "in") {
            this.Direction = "out";
        }
        else {
            this.Direction = "in";
        }

    };


};




var that = {
    
    init: function () {
        
        that.refreshTypes();
        that.refreshPredicates();
        return that;


    }
    ,
    types: {}
    ,
    Predicate: Predicate
    ,
    predicates: {}
    ,
    isType: function (label) {
        return that.types[label] !== undefined;
    }
    ,
    refreshTypes: function () {
        
        return cypher.executeQuery(
            "match (n:Type) return ID(n),n",
                "row")
                .then(function (data) {
            
            //private variable
            types = {};
            
            for (var i = 0; i < data.length; i++) {
                
                var d = data[i];
                if (d.row[1].Lookup) {
                    types[d.row[1].Lookup] = {
                        id: d.row[0],
                        Type: 'Type',
                        Lookup: d.row[1].Lookup,
                        Label: d.row[1].Lookup,
                        Props: d.row[1].Props,
                        Tabs: d.row[1].Tabs,
                    };
                }
                else {
                    console.log("Warning - type without lookup! (id:" + d.row[0] + ")");
                }

            }
            //angular.forEach(data, function (d) {
                
            //    if (d.row[1].Lookup) {
            //        types[d.row[1].Lookup] = {
            //            id: d.row[0],
            //            Type: 'Type',
            //            Lookup: d.row[1].Lookup,
            //            Label: d.row[1].Lookup,
            //            Props: d.row[1].Props,
            //            Tabs: d.row[1].Tabs,
            //        };
            //    }
            //    else {
            //        console.log("Warning - type without lookup! (id:" + d.row[0] + ")");
            //    }

            //});
            
            that.types = types;
            
            return types;

        });


    }
    ,
    refreshPredicates: function () {//consider creating lookup nodes for relationship types so that i can store properties for them
        
        return cypher.executeQuery(
            "match (n:Predicate) return n",
                   "row")
                   .then(function (data) {
            
            var predicates = {};
            
            for (var i =0; i < data.length; i++) {
                
                var d = data[i];
                predicates[d.row[0].Lookup] = new Predicate(d.row[0].Lookup);
            
            }
            //angular.forEach(data, function (d) {
            
            //    predicates[d.row[0].Lookup] = new Predicate(d.row[0].Lookup);
            
            //});
            
            that.predicates = predicates;
            
            return predicates;

        });


    }
    
    ,
    isSystemInfo: function (label) {
        
        return label == "Global" || label == "Type" || label == "Label" || label == "SystemInfo";

    },
    getLabelClass: function (node, label) {
        
        
        
        
        
        if (node && label === node.Type) {
            return 'label-warning';
        }
        
        if (that.isSystemInfo(label)) {
            return 'label-system';
        }
        
        if (that.isType(label)) {
            return 'label-inverse pointer';
        }
        
        
        return 'label-info';




    }
    
    //,
    //getImageSource: function (urlStub) {
    
    
    
    
    
    //}
    ,
    personTypes: ['Painter',
        'Illustrator',
        'Philosopher',
        'Poet',
        'FilmMaker',
        'Sculptor',
        'Writer',
        'Patron',
        'Leader',
        'Explorer',
        'Composer',
        'Scientist',
        'Caricaturist',
        'Mathematician']
    ,
    pictureTypes: ['Painting', 'Illustration', 'Drawing', 'Print']
    ,
    isPerson: function (type) {
        
        return type == 'Painter' ||
                type == 'Illustrator' ||
                type == 'Philosopher' ||
                type == 'Poet' ||
                type == 'FilmMaker' ||
                type == 'Sculptor' ||
                type == 'Writer' ||
                type == 'Patron' ||
                type == 'Leader' ||
                type == 'Explorer' ||
                type == 'Composer' ||
                type == 'Scientist' ||
                type == 'Caricaturist' ||
                type == 'Mathematician';

    }
    ,
    setLabelParents: function (n) {
        
        var labels = JSON.parse(JSON.stringify(n.labels));// angular.copy();
        
        
        if (labels.hasAny(that.pictureTypes)) {
            labels.push("Picture");
        }
        
        if (labels.hasAny(that.personTypes)) {
            labels.push("Person");
        }
        
        labels = labels.unique();
        
        n.labels = labels;
        
        
        return n;



    }




};


return that.init();

};