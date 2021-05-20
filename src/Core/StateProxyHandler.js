import readOnlyProxyHandler from './ReadOnlyProxyHandler';

export default function createStateProxyHandler() {
  return {
    get: function (obj, prop) {
      let result = obj[prop];
      if (result !== undefined) {
        if (result.isArray && (result.public || result.trackChanges)) {
          result = new Proxy(
            result.value,
            createArrayProxyHandler({
              variable: prop,
              nDimensions: result.nDimensions,
            }),
          );
        } else {
          result = result.value;
          if (
            result !== null &&
            typeof result === 'object' &&
            result.__isReadOnlyProxy !== true
          ) {
            result = new Proxy(result, readOnlyProxyHandler);
          }
        }
      }
      return result;
    },
    set: function (obj, prop, value) {
      throw Error('Property ' + prop + ' is read-only');
    },
    deleteProperty: function (obj, prop) {
      throw Error('Property ' + prop + ' is read-only');
    },
  };
}

function createArrayProxyHandler({ variable, nDimensions, indicesSoFar = [] }) {
  return {
    variable: variable,
    nDimensions: nDimensions,
    indicesSoFar: indicesSoFar,
    get: function (obj, index) {
      let result = obj[index];
      if (result !== null && typeof result === 'object' && nDimensions > 1) {
        result = new Proxy(
          result,
          createArrayProxyHandler({
            variable: this.variable,
            nDimensions: this.nDimensions - 1,
            indicesSoFar: [...this.indicesSoFar, index],
          }),
        );
      }
      return result;
    },
    set: function (obj, prop, value) {
      throw Error('Property ' + prop + ' is read-only');
    },
    deleteProperty: function (obj, prop) {
      throw Error('Property ' + prop + ' is read-only');
    },
  };
}
