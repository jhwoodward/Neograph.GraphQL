module.exports = function(config)
{
    
    "use strict";
    
    var extend = require('extend');
    config = extend ( require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
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

//cached list of predicates
var list = {};

var that = {

    create: function(lookup,direction){
        return new Predicate(lookup,direction);
    } 
    ,
     //object containing all predicates keyed on Lookup
    getList:function(){
        if (utils.isEmpty(list)){
            return that.refreshList();
        }
        else{
            return list;
        }
    }
    ,
    refreshList: function () {//consider creating lookup nodes for relationship types so that i can store properties for them
        
        return cypher.executeQuery(
            "match (n:Predicate) return n",
                   "row")
                   .then(function (data) {
            
            let predicates = {};
            
            for (var i =0; i < data.length; i++) {
                var d = data[i];
                predicates[d.row[0].Lookup] = new Predicate(d.row[0].Lookup);
            }

            list = predicates;
            return predicates;

        });
    }

};


return that;

};