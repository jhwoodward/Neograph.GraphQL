module.exports = function(config,router){
    
    "use strict";

 
    var picture = require('./picture')(config);

  var image = require('./image')(config);
  
   router.route('/picture/get/:id').get(function(req,res){
        picture.get(req.params.id)
            .then(function (data) {
               // if (!data){
               //     res.sendStatus(204);
              //  }
              //  else{
                    res.status(200).json(data);
              //  }
            })
            .catch(function (err) {
                res.status(500).json(err);
            });
        });
        
  router.route('/picture/getWithRels/:id').get(function(req,res){
        picture.getWithRels(req.params.id)
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
     
   //for more complex queries combining property, label and predicate searches 
   //post a json object like
   //{site:"artsy",labels:[Delacroix,Drawing],props:{props:[Title],val:"sketchbook"},predicate:{predicate:"BY",target:"Delacroix"}}
   
 
   router.route('/pictures/labelled/:labels').get(function(req,res){
       
         picture.list.labelled(req.params,req.query)
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


   router.route('/pictures/property/:prop/:val').get(function(req,res){
         picture.list.property(req.params,req.query)
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

   router.route('/pictures/:predicate/:id').get(function(req,res){
         picture.list.predicate(req.params,req.query)
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


   router.route('/pictures').post(function(req,res){
         picture.list.combined(req.body,req.query)
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
        
      //NB At the moment my ajax post is sending data in the query
      //Should be changed to request body
     router.route('/image/error').post(function(req,res){
         image.error(req.body)
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
