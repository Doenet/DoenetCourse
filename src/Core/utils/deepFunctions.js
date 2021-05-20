import me from 'math-expressions';

// from https://stackoverflow.com/a/40293777
export function deepClone(obj, BaseComponent, hash) {
  // Do not try to clone primitives or functions
  if (Object(obj) !== obj || obj instanceof Function) return obj;

  // Do not try to clone Doenet components
  if (BaseComponent !== undefined && obj instanceof BaseComponent) return obj;

  if (obj instanceof me.class) {
    return obj.copy();
  }

  if (hash === undefined) {
    hash = new WeakMap();
  }

  if (Array.isArray(obj)) {
    return [...obj.map((x) => deepClone(x, BaseComponent, hash))];
  }

  // seem to get empty object a lot, so short circuit it
  if (obj.constructor === Object && Object.entries(obj).length === 0) {
    return {};
  }

  if (hash.has(obj)) return hash.get(obj); // Cyclic reference
  try {
    // Try to run constructor (without arguments, as we don't know them)
    var result = new obj.constructor();
  } catch (e) {
    // Constructor failed, create object without running the constructor
    result = Object.create(Object.getPrototypeOf(obj));
  }
  // Optional: support for some standard constructors (extend as desired)
  if (obj instanceof Map)
    Array.from(obj, ([key, val]) =>
      result.set(
        deepClone(key, BaseComponent, hash),
        deepClone(val, BaseComponent, hash),
      ),
    );
  else if (obj instanceof Set) {
    // result.values = result.values.bind(result);
    Array.from(obj, (key) => result.add(deepClone(key, BaseComponent, hash)));
  }
  // Register in hash
  hash.set(obj, result);
  // Clone and assign enumerable own properties recursively
  return Object.assign(
    result,
    ...Object.keys(obj).map((key) => ({
      [key]: deepClone(obj[key], BaseComponent, hash),
    })),
  );
}

// based on https://stackoverflow.com/a/1144249
export function deepCompare(a, b, BaseComponent) {
  var leftChain, rightChain;

  function compare2Objects(x, y) {
    var p;

    // remember that NaN === NaN returns false
    if (Number.isNaN(x) && Number.isNaN(y)) {
      return true;
    }

    if (x === y) {
      return true;
    }

    // if components, equal if same component name
    if (
      BaseComponent !== undefined &&
      x instanceof BaseComponent &&
      y instanceof BaseComponent
    ) {
      return x.componentName === y.componentName;
    }

    // if math-expressions, equal if exact same syntax tree
    if (x instanceof me.class && y instanceof me.class) {
      return x.equalsViaSyntax(y);
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if (
      (typeof x === 'function' && typeof y === 'function') ||
      (x instanceof Date && y instanceof Date) ||
      (x instanceof RegExp && y instanceof RegExp) ||
      (x instanceof String && y instanceof String) ||
      (x instanceof Number && y instanceof Number)
    ) {
      return x.toString() === y.toString();
    }

    // At last checking prototypes as good as we can
    if (!(x instanceof Object && y instanceof Object)) {
      return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
      return false;
    }

    if (x.constructor !== y.constructor) {
      return false;
    }

    if (x.prototype !== y.prototype) {
      return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
      return false;
    }

    // Quick checking of one object being a subset of another.
    for (p in y) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      } else if (typeof y[p] !== typeof x[p]) {
        return false;
      }
    }

    for (p in x) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      } else if (typeof y[p] !== typeof x[p]) {
        return false;
      }

      switch (typeof x[p]) {
        case 'object':
        case 'function':
          leftChain.push(x);
          rightChain.push(y);

          if (!compare2Objects(x[p], y[p])) {
            // console.log(`false because objects weren't equal`);
            // console.log(x[p])
            // console.log(y[p])
            return false;
          }

          leftChain.pop();
          rightChain.pop();
          break;

        default:
          if (x[p] !== y[p]) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  leftChain = [];
  rightChain = [];

  return compare2Objects(a, b);
}
