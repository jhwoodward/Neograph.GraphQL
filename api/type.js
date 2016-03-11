module.exports = function(config)
{

    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var _ = require("lodash");

//cached list of types
var list = {};

var that = {

    //object containing all types keyed on Lookup
    getList:function(){
        if (utils.isEmpty(list)){
            return that.refreshList();
        }
        else{
            return list;
        }
    }
    ,
    isType: function (label) {
        return that.getList()[label] !== undefined;
    }
    ,
    refreshList: function () {
        
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
            
            list = types;
            
            return types;

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

};

return that;

};