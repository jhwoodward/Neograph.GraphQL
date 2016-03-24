module.exports = function(config)
{
    "use strict";

    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var changeCase = require("change-case");
    var predicate = require("./predicate")(config);
    var _ = require("lodash");



var that = {
    //object containing all types keyed on Lookup
    list: {}
    ,
    isClass: function (label) {
        return that.list[label] !== undefined;
    }
    ,
    getSchema:function(n){
        
    
     //   return that.list[n.]
    
    
    }
    ,
    refreshList: function () {
        return predicate.refreshList().then(that.buildSchema);
    }
    ,
    buildSchema:function(predicates){
        
        
        var props = "match (n:Class) optional match n - [r:PROPERTY] -> (p:Property) return n,collect(r),collect(p)";
        props += "union match (n:Class) - [:EXTENDS*] -> (b:Class)-[r:PROPERTY]->(p:Property) return n,collect(r),collect(p)";

/*
        //relationship definitions
        var relsOut = "match (n:Class) -[r] -> (c:Class)  where type(r)<>'EXTENDS' and type(r)<>'HAS' return n,collect(type(r)),collect(c)";
        var relsIn = "match (n:Class) <-[r] - (c:Class)  where type(r)<>'EXTENDS' and type(r)<>'HAS' return n,collect(type(r)),collect(c)";
        
        //inherit HAS relationships
        var has = "match (n:Class) - [:EXTENDS*] -> (b:Class) - [:HAS] -> (d:Class) return n,collect(d)";
        */
        
        var relTypes = "match (n:Class ) -[r] -> (c:Class)  where type(r)<>'EXTENDS'  return n.Lookup,collect(type(r)),'out' as direction,collect(c.Lookup)";
        relTypes += " union match (n:Class ) - [:EXTENDS*] -> (d:Class) - [r] -> (c:Class)  where type(r)<>'EXTENDS'   return n.Lookup,collect(type(r)),'out' as direction,collect(c.Lookup)";
        relTypes += " union match (n:Class ) <-[r] - (c:Class)  where type(r)<>'EXTENDS'  return n.Lookup,collect(type(r)),'in' as direction,collect(c.Lookup)";
        relTypes += " union match (n:Class ) - [:EXTENDS*] -> (d:Class) <- [r] - (c:Class)  where type(r)<>'EXTENDS'   return n.Lookup,collect(type(r)),'in' as direction,collect(c.Lookup)";


        
        return cypher.executeStatements([props,relTypes])
            .then(function (results) {
                
            var propData = results[0].data;
            let types = {};
            
            for (let i = 0; i < propData.length; i++) {

                var pd = propData[i];
                var type = utils.camelCase(pd.row[0]);

                if (!type.lookup) {
                    console.warn("Type without lookup (id:" + pd.row[0] + ")");
                    continue;
                }

                type.props={};
                var props = pd.row[2];//array
                for (let j = 0; j < props.length; j++) {
                    type.props[props[j].Lookup] = {
                        name:changeCase.camelCase(props[j].Lookup),
                        required: (pd.row[1][j] && pd.row[1][j].Required) || false,
                        type:props[j].Type || "string",
                    };
                }  

                //only add if it has props - otherwise it has no use
                if (Object.keys(type.props).length){
                    types[type.lookup] = type;
                }
              
            }
            
            let relTypes = results[1].data;

         
            
            for (let tkey in types){
                
       console.log('--------------------------');
       console.log(tkey);
        console.log('--------------------------');
       
                types[tkey].reltypes={};
                
                 let rels = relTypes.filter((item)=>{
                     return types[tkey].lookup === item.row[0];
                 });
                 
                

                 rels.forEach((item)=>{
                     
                    let predkeys = item.row[1];
                    
                    for (let x = 0; x < predkeys.length;x++){
                        let predkey = predkeys[x];
                      
                        types[tkey].reltypes[predkey]={
                                predicate:predicate.list[predkey],
                                direction: item.row[2],
                                class: item.row[3][x]
                            };
                       
                    }
                    
                  console.log(types[tkey].reltypes);
                    
                });
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
    /*
    ,
    items:function(id){
        var q = "match n:"
    }
    */

};

return (function(){
     that.refreshList();
     return that;
})();


};