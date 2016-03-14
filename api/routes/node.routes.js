module.exports = function(config){
    
    "use strict";

    var router = require('express').Router();
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
        

        
    router.route('/node/match').post(function(req,res){
        var txt = req.body.txt;
        var restrict = req.body.restrict;
        
        var searchFn;
        
        if (!restrict){
            searchFn = search.all;
        }
        else if (restrict === "user")
        {
            searchFn = function(){
                return search.label("User",txt);
            };
        }
        else if (restrict === "label")
        {
            searchFn = function(){
                return search.label("Label",txt);
            };
        }
        else{
            res.status(501).json("Restrict option not implemented: " + restrict);
        }

        searchFn(txt)
            .then(function (data) {
                res.status(200).json(data);
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
    /*
    router.route('/node/getProps').post(function (req, res) {
        res.status(200).json(nodeUtils.getPropsFromLabels(req.body));
    });
    
    router.route('/node/getImages').post(function (req, res) {

        node.getImages(req.body)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });
    
*/

    return router;

};
