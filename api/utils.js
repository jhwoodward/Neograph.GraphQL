module.exports = function(config)
{


var extend = require('extend');
 config = extend ( require('./configDefault'), config);
var cypher = require("./cypher")(config);

var _ = require("lodash");


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
    //if the node has any values in its labels array that match picture or person types
    //the corresponding parent label is added to the array
    //The array is uniqued before returning
    setLabelParents: function (n) {
        
        if (n.labels && n.labels.length)
        {
             var labels = JSON.parse(JSON.stringify(n.labels));

            if (_.intersection(labels,that.pictureTypes).length) {
                labels.push("Picture");
            }
            
            if (_.intersection(labels,that.personTypes).length) {
                labels.push("Person");
            }

            n.labels = _.uniq(labels);
        }
 
        return n;



    }
,
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
/**
 * Checks if value is empty. Deep-checks arrays and objects
 * Note: isEmpty([]) == true, isEmpty({}) == true, isEmpty([{0:false},"",0]) == true, isEmpty({0:1}) == false
 * @param value
 * @returns {boolean}
 */
 isEmpty: function(value) {
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




};


return that.init();

};