module.exports = function(config,router){
    
    "use strict";

 
    var picture = require('./picture')(config);


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
   
   var listLabelled = function(req,res){
       
         picture.list.labelled(req.params)
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
            
   }
       router.route('/picture/list/labelled/:labels/:pageNum/:pageSize/:sort/:sortOrder').get(listLabelled);
       router.route('/picture/list/labelled/:labels/:pageNum/:pageSize/:sort').get(listLabelled);
       router.route('/picture/list/labelled/:labels/:pageNum').get(listLabelled);
       router.route('/picture/list/labelled/:labels').get(listLabelled);


 var listProperty = function(req,res){
            
          picture.list.property(req.params)
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
            
        }

   router.route('/picture/list/property/:prop/:val/:pageNum/:pageSize/:sort/:sortOrder').get(listProperty);
   router.route('/picture/list/property/:prop/:val/:pageNum/:pageSize').get(listProperty);
   router.route('/picture/list/property/:prop/:val/:pageNum').get(listProperty);
   router.route('/picture/list/property/:prop/:val').get(listProperty);

        var listPredicate = function(req,res){
            
             picture.list.predicate(req.params)
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
            
        }
        
   router.route('/picture/list/:predicate/:id/:pageNum/:pageSize/:sort/:sortOrder').get(listPredicate);
   router.route('/picture/list/:predicate/:id/:pageNum/:pageSize').get(listPredicate);
   router.route('/picture/list/:predicate/:id/:pageNum').get(listPredicate);
   router.route('/picture/list/:predicate/:id').get(listPredicate);



    


  
  

    return router;

};
