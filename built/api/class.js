'use strict';

module.exports = function (config) {
    "use strict";

    var extend = require('extend');
    config = extend(require('./config.default'), config);
    var cypher = require("./cypher")(config);
    var utils = require("./utils")(config);
    var changeCase = require("change-case");
    var predicate = require("./predicate")(config);
    var _ = require("lodash");

    var that = {
        //object containing all types keyed on Lookup
        list: {},

        isClass: function isClass(label) {
            return that.list[label] !== undefined;
        },

        getSchema: function getSchema(n) {

            //   return that.list[n.]

        },

        refreshList: function refreshList() {
            return predicate.refreshList().then(that.buildSchema);
        },

        buildSchema: function buildSchema(predicates) {

            let props = "match (n:Class) optional match n - [r:PROPERTY] -> (p:Property) return n,collect(r),collect(p)";
            props += "union match (n:Class) - [:EXTENDS*] -> (b:Class)-[r:PROPERTY]->(p:Property) return n,collect(r),collect(p)";

            let relTypes = "match (n:Class ) -[r] -> (c:Class)  where type(r)<>'EXTENDS'";
            relTypes += "  return n.Lookup,collect(type(r)),'out' as direction,collect(c.Lookup),collect(r)";
            relTypes += " union match (n:Class ) - [:EXTENDS*] -> (d:Class) - [r] -> (c:Class)  where type(r)<>'EXTENDS' ";
            relTypes += "  return n.Lookup,collect(type(r)),'out' as direction,collect(c.Lookup),collect(r)";
            relTypes += " union match (n:Class ) <-[r] - (c:Class)  where type(r)<>'EXTENDS' ";
            relTypes += "  return n.Lookup,collect(type(r)),'in' as direction,collect(c.Lookup),collect(r)";
            relTypes += " union match (n:Class ) - [:EXTENDS*] -> (d:Class) <- [r] - (c:Class)  where type(r)<>'EXTENDS' ";
            relTypes += "  return n.Lookup,collect(type(r)),'in' as direction,collect(c.Lookup),collect(r)";

            return cypher.executeStatements([props, relTypes]).then(function (results) {

                let types = {};

                results[0].data.forEach(pd => {

                    let type = utils.camelCase(pd.row[0]);

                    if (!type.lookup) {
                        console.warn("Type without lookup (id:" + pd.row[0] + ")");
                        return;
                    }

                    let props = pd.row[2].map(e => {
                        return { name: changeCase.camelCase(e.Lookup), type: e.Type || "string" };
                    });
                    let propsMetadata = pd.row[1].map(e => {
                        return { required: e.Required || false };
                    });
                    type.props = _.keyBy(_.merge(props, propsMetadata), 'name');

                    type.reltypes = {};
                    let rels = results[1].data.filter(item => {
                        return type.lookup === item.row[0];
                    });
                    rels.forEach(e => {
                        let pred = e.row[1].map(p => {
                            return { predicate: predicate.list[p] };
                        });
                        let dir = _.fill(Array(pred.length), { direction: e.row[2] });
                        let cls = e.row[3].map(c => {
                            return { class: c };
                        });
                        //    let nolazy = e.row[4].map(z =>{return {nolazy:z.nolazy || false}});
                        let reltypes = _.keyBy(_.merge(pred, dir, cls), function (r) {
                            return r.direction === "in" ? r.predicate.reverse.toLowerCase() : r.predicate.lookup.toLowerCase();
                        });

                        type.reltypes = _.assignIn(type.reltypes, reltypes);
                    });

                    //only add if it has props - otherwise it has no use
                    if (Object.keys(type.props).length) {
                        types[type.lookup] = type;
                    }
                });

                that.list = types;
                return types;
            });
        },

        isSystemInfo: function isSystemInfo(label) {
            return label == "Global" || label == "Type" || label == "Label" || label == "SystemInfo";
        },
        //should be in the ui
        getLabelClass: function getLabelClass(node, label) {

            if (node && label === node.Type) {
                return 'label-warning';
            }

            if (that.isSystemInfo(label)) {
                return 'label-system';
            }

            if (that.isType(label)) {
                return 'label-inverse pointer';
            }
            return 'label-info';
        },

        personTypes: ['Painter', 'Illustrator', 'Philosopher', 'Poet', 'FilmMaker', 'Sculptor', 'Writer', 'Patron', 'Leader', 'Explorer', 'Composer', 'Scientist', 'Caricaturist', 'Mathematician'],

        pictureTypes: ['Painting', 'Illustration', 'Drawing', 'Print'],

        isPerson: function isPerson(type) {
            return that.personTypes.indexOf(type) > -1;
        }
        /*
        ,
        items:function(id){
            var q = "match n:"
        }
        */

    };

    return function () {
        that.refreshList();
        return that;
    }();
};
//# sourceMappingURL=class.js.map