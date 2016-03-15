
module.exports = function(config){
    
    "use strict";
    
    var router = require('express').Router();
     
   require("./node.routes")(config,router);
   require("./picture.routes")(config,router);
   require("./relationship.routes")(config,router);
   require("./graph.routes")(config,router);
   require("./search.routes")(config,router);
   require("./user.routes")(config,router);
   require("./multiple.routes")(config,router);
   require("./test.routes")(config,router);

   //miscellaneous routes
   
    router.route('/predicates').get(function (req, res) {
        predicate.refreshList().then(function (predicates) {
            res.status(200).json(predicates);
        });
    });
    
    router.route('/types').get(function (req, res) {
        type.refreshList().then(function (types) {
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
    
} ;