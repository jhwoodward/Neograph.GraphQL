module.exports = function(config,router){
    
    "use strict";

 
    var search = require('./search')(config);

    //used to be /node/match
      router.route('/search').post(function(req,res){
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
    
    
    router.route('/search/:label/:txt').get(function(req,res){
        search.label(req.params.label,req.params.txt).then(function (data) {
                res.status(200).json(data);
            })
            .catch(function (err) {
                res.status(500).json(err);
            });
    });
    
    //default search is anything with the Label label
        router.route('/search/:txt').get(function(req,res){
        search.label("Label",req.params.txt).then(function (data) {
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
