module.exports = function(config,router){
    
    "use strict";

   
    var node = require('./node')(config);


    router.route('/node/get/:id').get(function(req,res){
        node.get(req.params.id)
            .then(function (data) {
                if (!data){
                    res.sendStatus(204);
                }
                else{
                    res.status(200).json(data);
                }
            })
            .catch(function (err) {
                res.status(500).json(err);
            });
        });
        
        
   router.route('/node/getWithRels/:id').get(function(req,res){
         node.getWithRels(req.params.id)
             .then(function (data) {
                    //return 204 if null 
                if (!data){
                    res.sendStatus(204);
                }
                else{
                    res.status(200).json(data);
                }
            
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });


   
    
     router.route('/node/schema/:id').get(function(req,res){
        node.getSchema(req.params.id)
            .then(function (data) {
                if (!data){
                    res.sendStatus(204);
                }
                else{
                    res.status(200).json(data);
                }
            })
            .catch(function (err) {
                res.status(500).json(err);
            });
        });
        

  
    

    router.route('/node/save').post(function(req,res){
          node.save(req.body.node,req.body.user)
            .then(function (data) {
                res.status(201).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    
    //use for saveWikipagename
    //WILL NEED TO BE REIMPLEMENTED TO UPDATE RELATED WIKIPEDIA NODE
    /*
    
      router.route('/node/save/:prop').post(function(req,res){
          node.metadata.saveProp(req.params.prop,req.body)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
*/

    router.route('/node/delete').post(function(req,res){
           node.delete(req.body.node)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    
    router.route('/node/destroy').post(function(req,res){
           node.destroy(req.body.node)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    
    router.route('/node/restore').post(function(req,res){
           node.restore(req.body.node)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
   
   
    router.route('/node/list/labelled/:id').get(function (req, res) {

        node.list.labelled(req.params.id)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });

    return router;

};
