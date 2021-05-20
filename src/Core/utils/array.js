// from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
export function flattenDeep(arr1) {
  return arr1.reduce(
    (acc, val) =>
      Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val),
    [],
  );
}

export function flattenLevels(arr1, levels) {
  console.log(`levels: ${levels}`);
  return arr1.reduce(
    (acc, val) =>
      Array.isArray(val) && levels > 1
        ? acc.concat(flattenLevels(val, levels - 1))
        : acc.concat(val),
    [],
  );
}

export function mapDeep(arr, f, iprefix = [], origArr) {
  if (!origArr) {
    origArr = arr;
  }
  return arr.map((v, i) =>
    Array.isArray(v)
      ? mapDeep(v, f, [...iprefix, i], origArr)
      : f(v, [...iprefix, i], origArr),
  );
}
