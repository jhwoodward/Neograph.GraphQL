import cypher from './cypher';

function Predicate(data) {
  Object.assign(this, data);

  if (!this.reverse) {
    this.reverse = `(${this.lookup})`;
  }
}

Predicate.prototype.setDirection = function setDirection(direction) {
  this.direction = direction;
  return this;
};

Predicate.prototype.toString = function toString() {
  if (this.direction === 'in' && !this.symmetrical) {
    return this.reverse.replace(/_/g, ' ').toLowerCase();
  }
  return this.lookup.replace(/_/g, ' ').toLowerCase();
};

Predicate.prototype.flip = function flip() {
  if (this.isDirectional) {
    if (this.direction === 'in') {
      this.setDirection('out');
    } else {
      this.setDirection('in');
    }
  }
  return this;
};

const api = {
  init: () => {
    api.refreshList();
    return api;
  },
  // Can pass in active or reverse INFLUENCES OR INFLUENCED_BY
  get: lookup => {
    let p = api.list[lookup];
    if (!p) {
      console.warn(`Predicate ${lookup} does not exist in DB`);
      p = { lookup, reverse: `(${lookup})` };
    }
    return new Predicate(p);
  },
  list: {},
  refreshList: () => cypher.
    executeQuery('match (n:Predicate) return ID(n),n', 'row').
    then(data => {
      const predicates = {};
      for (let i = 0; i < data.length; i ++) {
        const d = data[i];
        const symmetrical = d.row[1].Symmetrical || false;
        if (d.row[1].Lookup) {
          predicates[d.row[1].Lookup] = {
            lookup: d.row[1].Lookup,
            force: d.row[1].Force, // Attract or Repel
            symmetrical,
            reverse: symmetrical ? d.row[1].Lookup : d.row[1].Reverse
          };
        } else {
          console.warn(`Predicate without lookup (id:${d.row[0]})`);
        }
      }
      api.list = predicates;
      return predicates;
    })
};

export default api.init();
