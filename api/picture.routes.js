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
     
   
       router.route('/picture/list/labelled/:id/:pageNum/:pageSize/:sort/:sortOrder').get(function(req,res){
        picture.list.labelled(req.params.id,req.params.pageNum,req.params.pageSize,req.params.sort,req.params.sortOrder)
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
        //TODO: ADD OVERLOADS FOR LABELLED

   
        
   router.route('/picture/list/:predicate/:id/:pageNum/:pageSize/:sort/:sortOrder').get(function(req,res){
        picture.list.predicate(req.params.id,req.params.predicate,req.params.pageNum,req.params.pageSize,req.params.sort,req.params.sortOrder)
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


    router.route('/picture/list/:predicate/:id/:pageNum/:pageSize/:sort').get(function(req,res){
        picture.list.predicate(req.params.id,req.params.predicate,req.params.pageNum,req.params.pageSize,req.params.sort)
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

            router.route('/picture/list/:predicate/:id/:pageNum/:pageSize').get(function(req,res){
        picture.list.predicate(req.params.id,req.params.predicate,req.params.pageNum,req.params.pageSize)
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

    router.route('/picture/list/:predicate/:id/:pageNum').get(function(req,res){
        picture.list.predicate(req.params.id,req.params.predicate,req.params.pageNum)
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

      router.route('/picture/list/:predicate/:id').get(function(req,res){
        picture.list.predicate(req.params.id,req.params.predicate)
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
