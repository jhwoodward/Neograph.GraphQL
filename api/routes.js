module.exports = function(config){
    var router = require('express').Router();
    var api = require('./api')(config);
    var utils = require("./utils")(config);
    
    router.route('/painters').get(api.painters);
    router.route('/testgraph').get(api.testGraph);

    router.route('/node/:id').get(api.getNode);
    router.route('/node/relationships/:id').get(api.getRelationships);
    router.route('/node/match').post(api.matchNodes);
    router.route('/nodeWithRels/:id').get(api.getNodeWithRels);
    router.route('/nodeByLabel/:label').get(api.getNodeByLabel);
    router.route('/nodeWithRelsByLabel/:label').get(api.getNodeWithRelsByLabel);
    router.route('/node/list').post(api.nodeList);
    router.route('/node/single').post(api.getOne);
    router.route('/node/saveWikipagename').post(api.saveWikipagename);
    router.route('/node/save').post(api.saveNode);
    //router.route('/node/saveRels').post(api.saveRels);
    router.route('/node/saveMultiple').post(api.saveMultiple);
    router.route('/node/delete').post(api.deleteNode);
    router.route('/node/destroy').post(api.destroyNode);
    router.route('/node/restore').post(api.restoreNode);
    router.route('/node/getProps').post(api.getPropsFromLabels);
    router.route('/node/getImages').post(api.getImages);

    router.route('/edge/save').post(api.saveEdge);
    router.route('/edge/delete').post(api.deleteEdge);

    router.route('/user/saveFavourite').post(api.saveFavourite);
    router.route('/user/:user').get(api.getUser);

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


    router.route('/graph').post(api.graph);

    router.route('/utils/distinctLabels').post(api.distinctLabels);

    return router;

};
