module.exports = function(config)
{
    "use strict";

    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var _ = require("lodash");



var that = {
    //object containing all types keyed on Lookup
    list: {}
    ,
    isType: function (label) {
        return that.list[label] !== undefined;
    }
    ,
    refreshList: function () {
        
        return cypher.executeQuery(
            "match (n:Type) return ID(n),n",
                "row")
                .then(function (data) {

            let types = {};
            
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

            that.list = types;
            return types;
        });
    }
    ,
    isSystemInfo: function (label) {
        
        return label == "Global" || label == "Type" || label == "Label" || label == "SystemInfo";
    },
    //should be in the ui
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
        return that.personTypes.indexOf(type) > -1;
    }

};

return (function(){
     that.refreshList();
     return that;
})();


};