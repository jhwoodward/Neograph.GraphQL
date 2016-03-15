module.exports = function(config,router){
    
    "use strict";

   
    var node = require('./node')(config);


    router.route('/node/labelled/:id').post(function (req, res) {

        node.getLabelled(req.params.id)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });
    
    router.route('/node/:id').get(function(req,res){
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
        

        
   
 

   
    router.route('/nodeWithRels/:id').get(function(req,res){
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

    router.route('/node/list').post(function(req,res){
          node.list(req.body)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    
    router.route('/node/single').post(function(req,res){
          node.single(req.body.q)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    
    router.route('/node/saveWikipagename').post(function(req,res){
          node.metadata.saveWikipagename(req.body)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    

    router.route('/node/save').post(function(req,res){
          node.save(req.body.node,req.body.user)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });


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
   

    return router;

};
