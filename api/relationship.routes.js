module.exports = function(config,router){
    
    "use strict";

    var relationship = require('./relationship')(config);

  router.route('/relationship/visual/:id1/:id2').get(function (req, res) {

        relationship.list.visual(req.params.id1,req.params.id2)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });
    
  router.route('/relationship/visual/:id').get(function (req, res) {

        relationship.list.visual(req.params.id)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });
    
    

    
     router.route('/relationship/conceptual/:id').get(function (req, res) {

        relationship.list.conceptual(req.params.id)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });
    
     router.route('/relationship/inferred/:id').get(function (req, res) {

        relationship.list.inferred(req.params.id)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });
    
    
    //used to be /edge/save
      router.route('/relationship/save').post(function(req,res){

          relationship.save(req.body.edge)//used to be req.body.e
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
        
    });
    
    //used to be /edge/delete
    router.route('/relationship/delete').post(function(req,res){

          relationship.delete(req.body.edge)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
        
    });
        
  
    


  
  

    return router;

};
