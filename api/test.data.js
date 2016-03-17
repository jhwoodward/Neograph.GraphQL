
module.exports = function(config){
    
    "use strict";
    


var node = require('./node')(config);
//for cleanup
var cypher = require("./cypher")(config);


  var nodes ={
      Joe:{name:"Joe",label:"Joe",colour:"brown",type:"horse",labels:["Label","mochatest"]},
      Jim:{name:"Jim",label:"Jim",colour:"green",type:"cat",labels:["Label","mochatest"]},
      Alex: {name:"Alex",label:"Alex",colour:"green",type:"cat",labels:["Label","mochatest"]},
      NoLabel: {name:"John",colour:"green",type:"person",labels:["mochatest"]},
  };
  
  function createNodes(done){
      
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
  }
  
  function cleanup(done){
    
        cypher.executeQuery("match (n:Mochatest) optional match (n)-[r]-() delete n,r")
        .then(function(){done();});
        
    }
  
  return {
      nodes:nodes,
      createNodes:createNodes,
      cleanup:cleanup
  }
  
  
}