module.exports = function(config,router){
    
    "use strict";

 
    var test = require('./test')(config);

 
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


   


  
  

    return router;

};
