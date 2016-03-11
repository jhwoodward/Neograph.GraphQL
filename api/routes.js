module.exports = function(config){
    var router = require('express').Router();
    var node = require('./node')(config);
    var edge = require('./edge')(config);
    var user = require('./user')(config);
    var multiple = require('./multiple')(config);
    var test = require('./test')(config);
    var utils = require("./utils")(config);
    var graph = require("./graph")(config);
    

    
    router.route('/test/painters').get(function (req, res) {
        test.painters()
            .then(function(data){
                res.status(200).json(data);
            })
            .catch(function (err) {
                res.status(500).json({error:err});
            });
        
    });
    
   
    router.route('/test/graph').get(function(req,res){
        test.graph()
            .then(function (data) {
                res.status(200).json(data);
            })
            .catch(function (err) {
                res.status(500).json(err);
            });
    });

    router.route('/graph').post(function(req,res) {
        graph.get(req.body.q, req.body.returnArray)
            .then(function (data) {
                res.status(200).json(data);
            }).catch(function (err) {
                res.status(500).json(err);
            });
    });

    router.route('/node/:id').get(function(req,res){
        node.get(req.params.id)
            .then(function (data) {
                res.status(200).json(data);
            })
            .catch(function (err) {
                res.status(500).json(err);
            });
        });
        
    router.route('/node/relationships/:id').get(function(req,res){
        node.getRelationships(req.params.id)
            .then(function (data) {
                res.status(200).json(data);
            })
            .catch(function (err) {
                res.status(500).json(err);
            });
        });
        
    router.route('/node/match').post(function(req,res){
        var txt = req.body.txt;
        var restrict = req.body.restrict;

        node.match(txt,restrict)
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
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    
    router.route('/nodeByLabel/:label').get(function(req,res){
        node.getByLabel(req.params.label)
            .then(function (data) {
                res.status(200).json(data);
             })
             .catch(function (err) {
                res.status(500).json(err);
             });
    });
    
    router.route('/nodeWithRelsByLabel/:label').get(function(req,res){
        node.getWithRelsByLabel(req.params.label)
            .then(function (data) {
                //return 204 if null 
                if (!data){
                    res.status(204);
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
          node.saveWikipagename(req.body)
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
    //router.route('/node/saveRels').post(api.saveRels);
   
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
    
    router.route('/node/getProps').post(function (req, res) {
        res.status(200).json(node.getPropsFromLabels(req.body));
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
    
    //nb changed from 'node/saveMultiple'
    var saveMultiple=function(req,res){
          multiple.save(req.body.multiple)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    };
    router.route('/node/saveMultiple').post(saveMultiple);
    router.route('/multiple/save').post(saveMultiple);

    router.route('/edge/save').post(function(req,res){

          edge.save(req.body.e)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
        
    });
    router.route('/edge/delete').post(function(req,res){

          edge.delete(req.body.edge)
          .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
        
    });

    router.route('/user/saveFavourite').post(function(req,res){
          user.saveFavourite(req.body.node,req.body.user)
            .then(function(data){
                res.status(200).json(data);
                })
            .catch(function (err) {
                res.status(500).json({error:err});
            });
    });
    
    router.route('/user/:user').get(function(req,res){
        user.get(req.params.user)
         .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });

    router.route('/predicates').get(function (req, res) {
        utils.refreshPredicates().then(function (predicates) {
            res.status(200).json(predicates);
        });
    });
    router.route('/types').get(function (req, res) {
        utils.refreshTypes().then(function (types) {
            res.status(200).json(types);
        });
    });

    router.route('/utils/distinctLabels').post(function(req,res){
        utils.distinctLabels(req.body.labels)    
        .then(function(data){
               res.status(200).json(data);
            })
          .catch(function (err) {
               res.status(500).json({error:err});
           });
    });

    return router;

};
