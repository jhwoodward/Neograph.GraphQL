import _ from 'lodash';
import changeCase from 'change-case';
import cypher from './cypher.js';
import utils from './utils';
import merge from 'deepmerge';

class QueryHelper {

  constructor(classDefs) {
    this.classDefs = classDefs;
    this.aliasPrefixes = ('a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z').split(',');
  }

  neoRelationship(reltype, relAlias) {
    relAlias = relAlias || '';

    if (reltype.predicate.symmetrical) {
      return ` - [${relAlias}:${reltype.predicate.lookup}] - `;
    }
    if (reltype.direction === 'out') {
      return ` - [${relAlias}:${reltype.predicate.lookup}] -> `;
    }
    return ` <- [${relAlias}:${reltype.predicate.lookup}] - `;
  }

  neoTarget(reltype, level) {
    const alias = `t${level}`;
    if (reltype.target) {
      return `(${alias}:${reltype.class} {Lookup:'${reltype.target}'}) `;
    }
    return `(${alias}:${reltype.class} )`;
  }

  neoWith(query) {
    const aliases = query.usedAliases.concat(query.relAliases);
    if (aliases && aliases.length) {
      return ` with ${aliases.join(',')}`;
    }
    return '';
  }

  neo(d) {
    const s = d.s;
    const level = d.level || 0;
    const aliasprefix = d.aliasprefix || 'a';
    const parentAlias = d.parentAlias;
    const query = d.query || d.s;// base query
    const params = {};
    const alias = aliasprefix + level;

    let q = this.neoWith(query);
    let match = `${alias}:${s.type.lookup}`;
    if (s.args.props.labels) {
      match += `:${s.args.props.labels.target.split(',').join(':')}`;
    }
    q += ` match (${match}) `;

    query.usedAliases.push(alias);

    // args.reltypes form additional filtering via relationship
    // args.props form additional filtering via where clause
    _.forOwn(s.args.reltypes, reltype => {
      q += `
      ${this.neoWith(query)} match (${alias}) 
      ${this.neoRelationship(reltype)} ${this.neoTarget(reltype, level)}
      `;
    });

    let cnt = 0;

    _.forOwn(s.args.props, prop => {
      if (prop.name !== 'labels') {
        if (cnt === 0) {
          q += ' where ';
        } else {
          q += ' and ';
        }

        if (prop.name === 'id') {
          q += `ID(${alias}) = {${alias + prop.name}} `;
        } else {
          let comparer = '=';
          if (prop.target.indexOf('*') === 0 ||
              prop.target.indexOf('*') === prop.target.length - 1) {
            comparer = '=~';
            prop.target.replaceAll('*', '.*');
          }
          q += `
          ${alias}.${changeCase.pascalCase(prop.name)} ${comparer}  
          {${alias + prop.name}} 
          `;
        }

        if (prop.type === 'number') {
          params[alias + prop.name] = parseInt(prop.target, 10);
        } else {
          params[alias + prop.name] = prop.target;
        }
        cnt += 1;
      }
    });

    // If (s.reltype) then query acts on a relationship with parent alias
    // (otherwise it starts with just the type (base query))
    if (s.reltype) {
      const relAlias = `${parentAlias}_${alias}`;
      q += `
      ${this.neoWith(query)} 
      match (${parentAlias}) ${this.neoRelationship(s.reltype, relAlias)} (${alias}) 
      `;
      query.relAliases.push(relAlias);
    }

    // Accumulate query and params
    query.q += ` ${q} `;
    Object.assign(query.params, params);

    return { alias, q, params };
  }

  recursiveSelection(d) {
    if (d.s.selectionSet && d.s.kind !== 'FragmentSpread') {
      const reltypekey = d.s.name.value;
      const reltype = d.parentType.reltypes[reltypekey];
      const type = this.classDefs[reltype.class];
      const args = d.s.arguments.reduce((acc, item) => {
        acc[item.name.value] = item.value.value;
        return acc;
      }, {});

      const thisBranch = d.selection[reltypekey] = {
        type,
        args: this.reduceArgs(type, args),
        reltype,
        selection: {}
      };

      const neoArgs = {
        s: thisBranch,
        level: d.level,
        aliasprefix: d.aliasPrefix,
        parentAlias: d.parentAlias,
        query: d.query
      };

      thisBranch.neo = this.neo(neoArgs);

      d.s.selectionSet.selections.forEach((sNext, i) => {
        const selArgs = {
          s: sNext,
          selection: thisBranch.selection,
          parentType: type,
          level: d.level + 1,
          aliasPrefix: this.aliasPrefixes[i],
          parentAlias: thisBranch.neo.alias,
          query: d.query
        };
        this.recursiveSelection(selArgs);
      });
    }
  }

  reduceArgs(type, args) {
    // args are used for filtering
    // They need to be split into props & reltypes
    // as filtering is implemented differently for each
    // - props always relate to fields
    // - reltypes always relate to relationships
    const argsArray = Object.keys(args).map(key => ({ key, value: args[key] }));

    const reduce = t =>
      argsArray.reduce((acc, item) => {
        if (t[item.key]) {
          acc[item.key] = Object.assign(t[item.key], { target: item.value });
        }
        return acc;
      }, {});

    return {
      reltypes: reduce(type.reltypes),
      props: reduce(type.props)
    };
  }

  mergeFragments(selections, fragments) {
    const mergeSelections = (sels) => {
      let out = [].concat(sels);
      // Merge fragments into selections
      sels.forEach(s => {
        if (s.kind === 'FragmentSpread') {
          let fragSelections = fragments[s.name.value].selectionSet.selections;
          fragSelections = mergeSelections(fragSelections);
          out = out.concat(fragSelections);
        }
      });
      return out;
    };
    return mergeSelections(selections);
  }

  resolve(baseType, baseArgs, selections, fragments) {
    const query = {
      type: baseType,
      args: this.reduceArgs(baseType, baseArgs),
      selection: {},
      q: '', // the query string that will be sent to neo4j
      params: {}, // the params object that will be sent to neo4j
      relAliases: [],
      usedAliases: [],
      selections: this.mergeFragments(selections, fragments)
    };

    query.neo = this.neo({ s: query });

    query.selections.forEach((s, i) => {
      const selArgs = {
        s,
        selection: query.selection,
        parentType: baseType,
        level: 1,
        aliasPrefix: this.aliasPrefixes[i],
        parentAlias: query.neo.alias,
        query
      };
      this.recursiveSelection(selArgs);
    });

    // Add return statement
    query.q += ` return ${query.usedAliases.join(',')}`;
    if (query.relAliases.length) {
      query.q += `, ${query.relAliases.join(',')}`;
    }
    const ids = query.usedAliases.map(alias => `ID(${alias})`);
    query.q += `,${ids.join(',')}`;
    const labels = query.usedAliases.map(alias => `LABELS(${alias})`);
    query.q += `,${labels.join(',')}`;

    return query;
  }

  execute(query) {
    return cypher.executeStatements(
      [cypher.buildStatement(query.q, 'row', query.params)]).
      then(results => {
        const data = [];
        results[0].data.forEach(d => {
          const row = {};
          let cnt = 0;
          results[0].columns.forEach(col => {
            if (col.indexOf('ID(') === -1 && col.indexOf('LABELS(') === -1) {
              row[col] = utils.camelCase(d.row[cnt]);
            } else if (col.indexOf('ID(') === 0) {
              const idForCol = col.replace('ID(', '').replace(')', '');
              row[idForCol].id = d.row[cnt];
            } else if (col.indexOf('LABELS(') === 0) {
              const labelsForCol = col.replace('LABELS(', '').replace(')', '');
              row[labelsForCol].labels = d.row[cnt];
            }
            cnt += 1;
          });
          data.push(row);
        });

        const grouped = _.groupBy(data, item => item.a0.id);

        const reltypePrefix = 'RELTYPE_';

        function fill(selection, row, obj) {
          Object.keys(selection).forEach(reltypekey => {
            const reltype = selection[reltypekey];
            const k = reltypePrefix + reltypekey;
            if (!obj[k]) {
              obj[k] = {};
            }
            obj[k][row[reltype.neo.alias].id] = row[reltype.neo.alias];
            fill(reltype.selection, row, obj[k][row[reltype.neo.alias].id]);
          });
        }

        const transformed = {};

        Object.keys(grouped).forEach(key => {
          grouped[key].forEach(row => {
            const out = row[query.neo.alias];
            fill(query.selection, row, out);
            if (transformed[out.id]) {
              transformed[out.id] = merge(transformed[out.id], out);
            } else {
              transformed[out.id] = out;
            }
          });
        });

        function toArray(item) {
          _.forOwn(item, (val, key) => {
            if (key.indexOf(reltypePrefix) === 0) {
              const k = key.replace(reltypePrefix, '');
              item[k] = [];
              _.forOwn(val, (val2) => {
                toArray(val2);
                item[k].push(val2);
              });
            }
          });
        }

        _.forOwn(transformed, item => {
          toArray(item);
        });

        return _.values(transformed);
      });
  }
}

export default (classDefs) => new QueryHelper(classDefs);
