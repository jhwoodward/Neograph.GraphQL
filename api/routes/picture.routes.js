module.exports = function(config){
    
    "use strict";

    var router = require('express').Router();
    var picture = require('./picture')(config);

  router.route('/picture/:predicate/:id').get(function(req,res){
        picture.by(req.params.id,req.params.predicate)
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
        
   router.route('/picture/:id').get(function(req,res){
        picture.get(req.params.id)
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
        

        
  
    


  
  

    return router;

};
