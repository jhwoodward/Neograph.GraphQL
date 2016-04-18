module.exports = function(config)
{
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var _ = require("lodash");

    function Predicate(data){
        _.extend(this,data);
          }
        
    Predicate.prototype.setDirection = function(direction){
        this.direction = direction;
        return this;
    };
    
    Predicate.prototype.toString = function(){
        if (this.direction==="in" && !this.symmetrical){
             if (this.reverse){//use reverse if present
                return this.reverse.replace(/_/g, ' ').toLowerCase();
            }
            else{
                var lookup = this.lookup.toUpperCase();
                if (lookup === "CREATED" || lookup==="CREATES")
                    return "created by";
                else if (lookup === "INFLUENCES")
                    return "influenced by";
                else if (lookup === "INSPIRES")
                    return "inspired by";
                else if (lookup === "ANTICIPATES")
                    return "anticipated by";
                else if (lookup === "DEVELOPS")
                    return "developed by";
                else if (lookup === "DEPICTS")
                    return "depicted by";
                else if (lookup === "TYPE_OF")
                    return "type(s)";
                else
                    return "(" + this.lookup.replace(/_/g, ' ').toLowerCase() + ")";
            }
        }
        
       // if (!this.isDirectional || !this.direction || this.direction === "out") {
       return this.lookup.replace(/_/g, ' ').toLowerCase();
       
        
    };
    
    Predicate.prototype.flip = function () {
    
        if (!this.isDirectional) {
            return;
        }
        if (this.direction === "in") {
            this.setDirection("out");
        }
        else {
            this.setDirection("in");
        }
        return this;

    };



var that = {
    init:function(){
        that.refreshList();
        return that;
    }
    ,
    //can pass in active or reverse INFLUENCES OR INFLUENCED_BY
    get: function(lookup){

        var p = that.list[lookup];
        
        if (!p)
        {
             console.warn('Predicate ' + lookup + ' does not exist in DB');
             
             p = {
                
                lookup: lookup,
                //  force: //Attract or Repel
                //  symmetrical: false,
                reverse: "(" + lookup + ")"
                };
            
        }

        return new Predicate(p);
    } 

    ,
     //object containing all predicates keyed on Lookup
    list: {}
    ,
    refreshList: function () {//consider creating lookup nodes for relationship types so that i can store properties for them
        
        return cypher.executeQuery(
            "match (n:Predicate) return ID(n),n",
                   "row")
                   .then(function (data) {
            
            let predicates = {};
            
            for (var i =0; i < data.length; i++) {
                var d = data[i];
                
                let symmetrical = d.row[1].Symmetrical || false;
                 if (d.row[1].Lookup) {
                    predicates[d.row[1].Lookup] = {
                      //  id: d.row[0],
                        lookup: d.row[1].Lookup,
                        force: d.row[1].Force,//Attract or Repel
                        symmetrical:symmetrical,
                        reverse: symmetrical ? d.row[1].Lookup : d.row[1].Reverse 
                    };
                }
                else {
                    console.warn("Predicate without lookup (id:" + d.row[0] + ")");
                }

            }

            that.list = predicates;
            return predicates;

        });
    }

};


return that.init();

};