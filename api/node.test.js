"use strict";

var assert = require('assert');
var should = require('should');
var config = require("../api-config");
    
var node = require('./node')(config);
//for cleanup
var cypher = require("./cypher")(config);

describe('Node', function() {
    
        // runs after all tests in this block
  before(cleanup);
  
  var nodes ={
      Joe:{name:"Joe",label:"Joe",colour:"brown",type:"horse",labels:["Label","mochatest"]},
      Jim:{name:"Jim",label:"Jim",colour:"green",type:"cat",labels:["Label","mochatest"]},
     Alex: {name:"Alex",label:"Alex",colour:"green",type:"cat",labels:["Label","mochatest"]},
  };
  
  
  var deleted;
  
  describe('insert', function () {
        it('should return a new id for the created node', function (done) {
            var createdCount = 0;
            function created(){
                createdCount +=1;
                if (createdCount === Object.keys(nodes).length){
                    done();
                }
            }
            
            for (let key in nodes){
                node.save(nodes[key]).then(function(saved){
                    saved.should.have.property('id').which.is.a.Number().above(-1);
                    saved.should.have.property('created').which.is.a.Number().above(0);
                    nodes[key]=saved;//store for further operations
                    created();
                });
            }
           
        });
  });
  
   describe('update', function () {
        it('should update properties when they change', function (done) {
            var n = nodes.Joe;
            n.type="cow";
            node.save(n).then(function(node){
                node.should.have.property('id').which.is.a.Number().equal(n.id);
                node.should.have.property('created').which.is.a.Number().equal(n.created);  
                node.should.have.property('type').which.is.equal("cow");
                node.should.have.property('name').which.is.equal("Joe");
                n=node;//store for further operations
                done();
            });
        });
        
          it('should add relationships when they change', function (done) {
            var n = nodes.Alex;
            n.relationships={
                "likes":{predicate:{lookup:'likes',direction:'out'},
                "items":[nodes.Joe]}
            }
            node.save(n).then(function(node){
                node.should.have.property('relationships');
                node.relationships.should.have.property('likes');  
                n=node;//store for further operations
                done();
            });
        });
        
           it('should remove relationships when they change', function (done) {
            var n = nodes.Joe;
            n.type="cow";
            node.save(n).then(function(node){
                node.should.have.property('id').which.is.a.Number().equal(n.id);
                node.should.have.property('created').which.is.a.Number().equal(n.created);  
                node.should.have.property('type').which.is.equal("cow");
                node.should.have.property('name').which.is.equal("Joe");
                n=node;//store for further operations
                done();
            });
        });
    
        it('should add labels when they change', function (done) {
             var n = nodes.Joe;
            n.labels.push("camera");
            n.labels.push("dog");
            n.labels.sort();
            node.save(n).then(function(node){
                node.labels.should.be.instanceof(Array).and.have.lengthOf(4);
                n=node;//store for further operations
                done();
            });
        });
    
        it('should remove labels when they change', function (done) {
             var n = nodes.Joe;
            n.labels.pop(); 

            node.save(n).then(function(node){
                node.labels.should.be.instanceof(Array).and.have.lengthOf(3);
                n=node;//store for further operations
                done();
            });
        });
    });

    describe('delete', function () {
        it('should mark node as deleted', function (done) {
             var n = nodes.Joe;
            node.delete(n).then(function(node){
                node.should.have.property('id').which.is.a.Number().equal(n.id);
                node.should.have.property('deleted').which.is.a.Number().above(0);  
                node.labels.should.be.instanceof(Array).and.have.lengthOf(1);
                node.labels[0].should.equal("Deleted");
            
                deleted=node;//store for further operations
                done();
            });
        });
    });
    
   describe('restore', function () {

        it('should restore node as before', function (done) {
            node.restore(deleted).then(function(node){
                node.should.eql(nodes.Joe);//eql for object comparison
                done();
            });
        });
    });
    
    describe('get',function(){
        it ('should return the full node object',function(done){

              node.get(nodes.Joe.id).then(function(node){
                 node.should.eql(nodes.Joe);//eql for object comparison
                   done();
                });
        });
    });
    
   describe('destroy', function () {
        it('should be gone forever', function (done) {
            node.destroy(deleted).then(function(){
                node.get(deleted).then(function(node){
                    should.not.exist(node);
                   done();
                });
            });
        });
    });
    
    
  
    
 
    // runs after all tests in this block
  after(cleanup);
  
  
    function cleanup(done){
        
        cypher.executeQuery("match (n:mochatest) optional match (n)-[r]-() delete n,r")
        .then(function(){done();});
        
    }
  
});
