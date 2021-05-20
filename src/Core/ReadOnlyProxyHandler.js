const readOnlyProxyHandler = {
  get: function (obj, prop) {
    if (prop === '__isReadOnlyProxy') {
      return true;
    }
    let result = obj[prop];
    if (
      result !== null &&
      typeof result === 'object' &&
      result.__isReadOnlyProxy !== true
    ) {
      return new Proxy(result, readOnlyProxyHandler);
    } else {
      return result;
    }
  },
  set: function (obj, prop, value) {
    throw Error('Property ' + prop + ' is read-only');
  },
  deleteProperty: function (obj, prop) {
    throw Error('Property ' + prop + ' is read-only');
  },
};

export default readOnlyProxyHandler;
