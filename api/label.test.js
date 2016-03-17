"use strict";

var assert = require('assert');
var should = require('should');
var config = require("../api-config");
    
var node = require('./node')(config);
var utils = require('./utils')(config);
//for cleanup
var cypher = require("./cypher")(config);
var _=require("lodash");
var changeCase=require("change-case");

describe('Node', function() {
    
        // runs after all tests in this block
  before(cleanup);
  
  var nodes ={
      Joe:{name:"Joe",label:"Joe",colour:"brown",type:"horse",labels:["Label","mochatest"]},
      Jim:{name:"Jim",label:"Jim",colour:"green",type:"cat",labels:["Label","mochatest"]},
     Alex: {name:"Alex",label:"Alex",colour:"green",type:"cat",labels:["Label","mochatest"]},
  };
  
  //placeholder store deleted node
  var nDeleted;
  
 
  
   describe('update', function () {
     

        it('should add labels when they change', function (done) {
            var n = nodes.Joe;
            n.labels.push("camera");
            n.labels.push("dog");
          
            node.save(n).then(function(saved){
                saved.labels.should.be.instanceof(Array).and.have.lengthOf(4);
                saved.labels.should.containEql("Camera");
                saved.labels.should.containEql("Dog");
                
                //what the api should so to the labels
                n.labels=utils.pascalCase(n.labels);
                n.labels = n.labels.sort();
                
                saved.labels.should.eql(n.labels);
                n=saved;//store for further operations
                done();
            });
        });
    
        it('should remove labels when they change', function (done) {
            var n = nodes.Joe;
            n.labels = _.remove(n.labels,function(e){return e!="Camera";}); 

            node.save(n).then(function(saved){
                saved.labels.should.be.instanceof(Array).and.have.lengthOf(3);
                saved.labels.should.not.containEql("Camera");
                saved.labels.should.containEql("Dog");
                n=saved;//store for further operations
                done();
            });
        });
        
       it('labels should be pascal case', function (done) {
            node.get(nodes.Jim).then(function(saved){
                for (let i = 0;i < saved.labels.length;i++)
                {
                    let firstLetterOfLabel = saved.labels[i][0];
                    changeCase.isUpperCase(firstLetterOfLabel).should.equal(true);
                }
                done();
            });
        });
    });

 
    // runs after all tests in this block
  after(cleanup);
  
  
    function cleanup(done){
        
        cypher.executeQuery("match (n:Mochatest) optional match (n)-[r]-() delete n,r")
        .then(function(){done();});
        
    }
  
});
