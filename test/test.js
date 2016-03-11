var assert = require('assert');
var should = require('should');

    var config = require("../api-config");
    
  var node = require('../api/node')(config);
    var edge = require('../api/edge')(config);
    var user = require('../api/user')(config);
    var multiple = require('../api/multiple')(config);
    var test = require('../api/test')(config);
    var utils = require("../api/utils")(config);
    var graph = require("../api/graph")(config);
    
    //for cleanup
     var cypher = require("../api/cypher")(config);

 
//test
describe('Test', function() {
  describe('painters', function () {
    it('should return 10 painters', function (done) {
        
      test.painters().then(function(data){
          assert.equal(data.nodes.length,10);
          done();
      });
    });
  });
});

describe('Node', function() {
    
  var n = {name:"Joe",colour:"brown",type:"horse",labels:["mochatest"]};
  var deleted;
  
  describe('insert', function () {
        it('should return a new id for the created node', function (done) {
            node.save(n).then(function(node){
                node.should.have.property('id').which.is.a.Number().above(-1);
                node.should.have.property('created').which.is.a.Number().above(0);
                n=node;//store for further operations
                done();
            });
        });
  });
  
   describe('update', function () {
        it('should update properties when they change', function (done) {
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
            n.labels.push("camera");
            n.labels.push("dog");
            node.save(n).then(function(node){
                node.labels.should.be.instanceof(Array).and.have.lengthOf(3);
                n=node;//store for further operations
                done();
            });
        });
    
        it('should remove labels when they change', function (done) {
            n.labels = ["house","car"];
            node.save(n).then(function(node){
                node.labels.should.be.instanceof(Array).and.have.lengthOf(2);
                n=node;//store for further operations
                done();
            });
        });
    });

    describe('delete', function () {
        it('should mark node as deleted', function (done) {
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
                node.should.eql(n);//eql for object comparison
                done();
            });
        });
    });
    
     // runs after all tests in this block
  after(function() {
      //cleanup
      cypher.executeQuery("match (n:mochatest) optional match (n)-[r]-() delete n,r");
 
  });
  
  
});