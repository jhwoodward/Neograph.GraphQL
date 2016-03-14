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
        
        if (!this.isDirectional || !this.direction) {
            this.key = this.lookup;
        }
        else if (this.direction === "out") {
            this.key = this.lookup + " ->";
        }
        else {
            this.key = this.lookup + " <-";
        }
        return this;
    };
    
    Predicate.prototype.toString = function(){
        
        if (!this.isDirectional || !this.direction || this.direction === "out") {
            return this.lookup.replace(/_/g, ' ').toLowerCase();
        }
        else {
            if (this.reverse){
                return this.reverse.replace(/_/g, ' ').toLowerCase();
            }
            else{

                if (this.lookup == "CREATED" || this.lookup==="CREATES")
                    return "created by";
                else if (this.lookup == "INFLUENCES")
                    return "influenced by";
                else if (this.lookup == "INSPIRES")
                    return "inspired by";
                else if (this.lookup == "ANTICIPATES")
                    return "anticipated by";
                else if (this.lookup == "DEVELOPS")
                    return "developed by";
                else if (this.lookup == "DEPICTS")
                    return "depicted by";
                else if (this.lookup == "TYPE_OF")
                    return "type(s)";
                else
                    return "(" + this.lookup.replace(/_/g, ' ').toLowerCase() + ")";
            }
        }
        
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


//cached list of predicates
var list = {};

var that = {
    init:function(){
        that.refreshList();
        return that;
    }
    ,
    get: function(lookup){

        var p = list[lookup];
        
        if (!p)
        {
             console.warn('Warning - predicate ' + lookup + ' does not exist in DB');
             
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
    list: list
    ,
    refreshList: function () {//consider creating lookup nodes for relationship types so that i can store properties for them
        
        return cypher.executeQuery(
            "match (n:Predicate) return ID(n),n",
                   "row")
                   .then(function (data) {
            
            let predicates = {};
            
            for (var i =0; i < data.length; i++) {
                var d = data[i];
                
                 if (d.row[1].Lookup) {
                    predicates[d.row[1].Lookup] = {
                        id: d.row[0],
                        lookup: d.row[1].Lookup,
                        force: d.row[1].Force,//Attract or Repel
                        symmetrical:d.row[1].Symmetrical || false,
                        reverse:d.row[1].Reverse 
                    };
                }
                else {
                    console.log("Warning - predicate without lookup! (id:" + d.row[0] + ")");
                }

            }

            list = predicates;
            return predicates;

        });
    }

};


return that.init();

};