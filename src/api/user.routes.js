module.exports = function(config,router){
    
    "use strict";

 
    var user = require('./user')(config);

 
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

        
  
    


    return router;

};
