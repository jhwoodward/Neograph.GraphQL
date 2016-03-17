"use strict";

var assert = require('assert');
var should = require('should');
var config = require("../api-config");
    
var node = require('./node')(config);
var utils = require('./utils')(config);
var testData = require("./test.data")(config);
var _=require("lodash");
var changeCase=require("change-case");

describe('Relationship', function() {
    

  before(function(done){
      testData.cleanup(function(){
           testData.createNodes(done);
      });
  });
  after(testData.cleanup);
  
   describe('create new node', function () {

          it('should create relationship with existing nodes', function (done) {
            var n =  {name:"George",label:"George",colour:"brown",type:"elephant",labels:["Label","mochatest"]};
            n.relationships={
                "loves":{
                            predicate:{
                                lookup:'loves',
                                direction:'out'
                            },
                        "items":[testData.nodes.Joe]
                    }
                    ,
                    "influenced by":{
                        predicate:{
                            lookup:'influences',
                            direction:"in"
                    },
                        "items":[testData.nodes.Jim]
                    }
            }
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.have.property('loves');  
                saved.relationships.should.have.property('influenced by');  
                done();
            });
        });
        
   });
   
   describe('update node', function () {

          it('should create relationship', function (done) {
            var n = testData.nodes.Alex;
            n.relationships={
                "likes":{
                            predicate:{
                                lookup:'likes',
                                direction:'out'
                            },
                        "items":[testData.nodes.Joe]
                    }
                    ,
                    "influenced by":{
                        predicate:{
                            lookup:'influences',
                            direction:"in"
                    },
                        "items":[testData.nodes.Jim]
                    }
            }
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.have.property('likes');  
                saved.relationships.should.have.property('influenced by');  
                n=saved;//store for further operations
                done();
            });
        });
        
         it('should add a relationship', function (done) {
            var n = testData.nodes.Jim;
            if (!n.relationships) n.relationships={};
            n.relationships["watches"]={
                        predicate:{
                            lookup:'watches',
                            direction:"out"
                    },
                        "items":[testData.nodes.Alex]
                    }
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.have.property('watches');  
                saved.relationships.watches.items[0].label.should.equal("Alex");
                n=saved;//store for further operations
                done();
            });
        });
        /*
            it('should create node for relationship if node does not exist', function (done) {
            var n = testData.nodes.Jim;
            if (!n.relationships) n.relationships={};
            n.relationships["hates"]={
                        predicate:{
                            lookup:'hates',
                            direction:"out"
                    },
                        "items": [
                            {name:"Paul",colour:"black",type:"person",labels:["mochatest"]}
                        ]
                        ,
                    }
            node.save(n).then(function(saved){
                saved.relationships.should.have.property('hates');   
                done();
            });
        });
        */
          it('should not return relationship unless the item has a "Label" label and property', function (done) {
            var n = testData.nodes.Jim;
            if (!n.relationships) n.relationships={};
            n.relationships["notlabelled"]={
                        predicate:{
                            lookup:'notlabelled',
                            direction:"out"
                    },
                        "items":[testData.nodes.NoLabel]
                    }
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.not.have.property('notlabelled');  
                n=saved;//store for further operations
                done();
            });
        });
        
       it('should add items to a relationship', function (done) {
            var n = testData.nodes.Jim;
            n.relationships.watches.items.push(testData.nodes.Joe);
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.have.property('watches');  
                saved.relationships.watches.items.length.should.equal(2);
                saved.relationships.watches.items[0].label.should.equalOneOf("Joe","Alex");
                saved.relationships.watches.items[1].label.should.equalOneOf("Joe","Alex");
                saved.relationships.watches.items[0].label.should.not.equal(saved.relationships.watches.items[1].label);
                n=saved;//store for further operations
                done();
            });
        });
        
          it('should remove items from a relationship', function (done) {
            var n = testData.nodes.Jim;
            n.relationships.watches.items.pop();
            
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.have.property('watches');  
                saved.relationships.watches.items.length.should.equal(1);
                n=saved;//store for further operations
                done();
            });
        });
        
       it('should remove a relationship', function (done) {
            var n = testData.nodes.Alex;
            delete n.relationships["likes"];
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.not.have.property('likes');  
                saved.relationships.should.have.property('influenced by');  
                n=saved;//store for further operations
                done();
            });
        });
        
        
        
        it('relationship should change direction', function (done) {
            var n = testData.nodes.Alex;
            //manual flip
            n.relationships["influences"] =  _.extend({},n.relationships["influenced by"]);
            n.relationships["influences"].predicate.direction = "out";
            delete n.relationships["influenced by"];
            node.save(n).then(function(saved){
                saved.should.have.property('relationships');
                saved.relationships.should.not.have.property('likes');  
                saved.relationships.should.not.have.property('influenced by');  
                saved.relationships.should.have.property('influences');
                saved.relationships.influences.predicate.direction.should.equal("out");
                n=saved;//store for further operations
                done();
            });
        });
    
    
    });



});
