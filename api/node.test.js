"use strict";

var assert = require('assert');
var should = require('should');
var config = require("../api-config");
    
var node = require('./node')(config);
var utils = require('./utils')(config);
var testData = require("./test.data")(config);
var _=require("lodash");
var changeCase=require("change-case");

describe('Node', function() {
    
        // runs after all tests in this block
  before(testData.cleanup);
  after(testData.cleanup);
  

  //placeholder store deleted node
  var nDeleted;
  
  describe('create', function () {
        it('should return a new id for the created node', function (done) {
            var createdCount = 0;
            function created(){
                createdCount +=1;
                if (createdCount === Object.keys(testData.nodes).length){
                    done();
                }
            }
            
            for (let key in testData.nodes){
                node.save(testData.nodes[key]).then(function(saved){
                    saved.should.have.property('id').which.is.a.Number().above(-1);
                    saved.should.have.property('created').which.is.a.Number().above(0);
                    testData.nodes[key]=saved;//store for further operations
                    created();
                });
            }
           
        });
  });
  
   describe('update', function () {
        it('should update properties when they change', function (done) {
            var n = testData.nodes.Joe;
            n.type="cow";
            node.save(n).then(function(saved){
                saved.should.have.property('id').which.is.a.Number().equal(n.id);
                saved.should.have.property('created').which.is.a.Number().equal(n.created);  
                saved.should.have.property('type').which.is.equal("cow");
                saved.should.have.property('name').which.is.equal("Joe");
                n=saved;//store for further operations
                done();
            });
        });

        it('should add labels when they change', function (done) {
            var n = testData.nodes.Joe;
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
            var n = testData.nodes.Joe;
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
            node.get(testData.nodes.Jim).then(function(saved){
                for (let i = 0;i < saved.labels.length;i++)
                {
                    let firstLetterOfLabel = saved.labels[i][0];
                    changeCase.isUpperCase(firstLetterOfLabel).should.equal(true);
                }
                done();
            });
        });
    });

    describe('delete', function () {
        it('should mark node as deleted', function (done) {
             var n = testData.nodes.Joe;
            node.delete(n).then(function(deleted){
                deleted.should.have.property('id').which.is.a.Number().equal(n.id);
                deleted.should.have.property('deleted').which.is.a.Number().above(0);  
                deleted.labels.should.be.instanceof(Array).and.have.lengthOf(1);
                deleted.labels[0].should.equal("Deleted");
            
                nDeleted = deleted;//store for further operations
                done();
            });
        });
    });
    
   describe('restore', function () {

        it('should restore node as before', function (done) {
            node.restore(nDeleted).then(function(restored){
                restored.should.eql(testData.nodes.Joe);//eql for object comparison
                done();
            });
        });
    });
    
    describe('get',function(){
        it ('should return the full node object',function(done){

              node.get(testData.nodes.Joe.id).then(function(saved){
                 saved.should.eql(testData.nodes.Joe);//eql for object comparison
                   done();
                });
        });
    });
    
   describe('destroy', function () {
        it('should be gone forever', function (done) {
            node.destroy(nDeleted).then(function(){
                node.get(nDeleted).then(function(destroyed){
                    should.not.exist(destroyed);
                   done();
                });
            });
        });
    });
    

  
});
