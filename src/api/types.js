import {
    GraphQLObjectType,
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLBoolean
} from 'graphql';


const predicate = new GraphQLObjectType({
  name: 'Predicate',
  fields: () => ({
    lookup: { type: GraphQLString },
    direction: { type: GraphQLString }, // in/out
    symmetrical: { type: GraphQLBoolean },
    force: { type: GraphQLString }// Attract/Repel
  })
});


const classRelationship = new GraphQLObjectType({
  name: 'Relationship',
  fields: () => ({
    predicate: { type: predicate },
    items: { type: new GraphQLList(classtype) },
  })
});

const property = new GraphQLObjectType({
  name: 'Property',
  fields: () => ({
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    required: { type: GraphQLBoolean },
    readonly: { type: GraphQLBoolean }
  })
});

const classtype = new GraphQLObjectType({
  name: 'Class',
  fields: () => ({

    lookup: { type: GraphQLString },
    extends: { type: new GraphQLList(classtype) },
    properties: { type: new GraphQLList(property) },
    relationships: { type: new GraphQLList(classRelationship) },
  })
});

const lookup = new GraphQLObjectType({
  name: 'Lookup',
  fields: () => ({
    id: { type: GraphQLInt },
    type: { type: GraphQLString },
    lookup: { type: GraphQLString }
  })
});

const edgeProps = new GraphQLObjectType({
  name: 'EdgeProps',
  fields: {
    weight: { type: GraphQLInt }
  }
});

const edge = new GraphQLObjectType({
  name: 'Edge',
  fields: {
    id: { type: GraphQLInt },
    start: { type: GraphQLInt },
    end: { type: GraphQLInt },
    predicate: { type: GraphQLString },
    properties: { type: edgeProps }
  }
});

const graph = new GraphQLObjectType({
  name: 'Graph',
  fields: {
    nodes: { type: new GraphQLList(lookup) },
    edges: { type: new GraphQLList(edge) },
  }
});

export default {
  classtype,
  graph
};
