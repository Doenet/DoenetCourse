import me from 'math-expressions';
import { deepCompare } from './deepFunctions';
import MathComponent from '../components/Math';
import { normalizeMathExpression } from './math';

export default function checkEquality({
  object1,
  object2,
  isUnordered = false,
  partialMatches = false,
  matchExactLocations = false,
  symbolicEquality = false,
  simplify = 'none',
  expand = false,
  allowedErrorInNumbers = 0,
  includeErrorInNumberExponents = false,
  allowedErrorIsAbsolute = false,
  nSignErrorsMatched = 0,
}) {
  /*
    Equality check
    
    Types of equality checks
    - numeric check (if symbolicEquality === false) which samples variables
      in complex plane and will return equal if can find open sets 
      from which a number of samples return nearly identical results for both objects
    - symbolic equality: requires identical abstract syntax trees,
      possibly after simplification and expand normalizations
    - deep equality for any non math-expression objects
    
    Special logic for container elements:
    - math-expression tuples, lists, arrays, vectors, intervals, sets, matrices
    - Javascript arrays

    - For math-expressions
      * will convert tuples to vectors, open intervals
      * will convert arrays to closed intervals
      * will convert singletons to vectors, sets, tuples, lists, arrays

    - If isUnordered is set, then check if elements match
      regardless of order.
    - If partialMatches is set, then check if just some elements
      match and return the fraction that match.  For ordered objects, 
      the matching elements must be in the same order.

    Return object with
    - fraction_equal: number between 0 and 1

  */

  let haveMathExpressions = false;

  // first check if objects can be converted into the same type of objects

  if (object1 instanceof me.class) {
    haveMathExpressions = true;
    if (!(object2 instanceof me.class)) {
      // see if convert object2 to a math expression
      if (typeof object2 === 'number' || typeof object2 === 'string') {
        object2 = me.fromAst(object2);
      } else {
        // return not equal if only one is math-expression
        return { fraction_equal: 0 };
      }
    }
  } else if (object2 instanceof me.class) {
    haveMathExpressions = true;
    // see if convert object1 to a math expression
    if (typeof object1 === 'number' || typeof object1 === 'string') {
      object1 = me.fromAst(object1);
    } else {
      // return not equal if only one is math-expression
      return { fraction_equal: 0 };
    }
  }

  let normalize = function (x) {
    if (!(x instanceof me.class)) {
      x = me.fromAst(x);
    }

    x = x.normalize_function_names().normalize_applied_functions();

    if (simplify === 'none') {
      if (allowedErrorInNumbers > 0) {
        // only if allowing rounding, do we replace constants with floats
        x = x.constants_to_floats();
      }
    } else if (simplify === 'numberspreserveorder') {
      x = x.evaluate_numbers({ max_digits: Infinity, skip_ordering: true });
    } else if (simplify === 'number') {
      x = x.evaluate_numbers({ max_digits: Infinity });
    } else {
      x = x.evaluate_numbers({
        max_digits: Infinity,
        evaluate_functions: true,
      });
    }
    return normalizeMathExpression({
      value: x,
      simplify: simplify,
      expand: expand,
    });
  };

  let check_equality;
  if (haveMathExpressions) {
    if (symbolicEquality) {
      check_equality = function (a, b) {
        let expr_a = normalize(a);
        let expr_b = normalize(b);

        if (nSignErrorsMatched > 0) {
          // We have to make a deep copy
          // because equalSpecifiedSignErrors does in-place changes of ast
          // (and then undoes them)
          // TODO: is this the best solution?
          expr_b = JSON.parse(JSON.stringify(expr_b), me.reviver);

          let equalityFunction = function (aa, bb) {
            aa = normalize(aa); // only have to normalize aa as that is the one that gets modified
            return aa.equalsViaSyntax(bb, {
              allowed_error_in_numbers: allowedErrorInNumbers,
              include_error_in_number_exponents: includeErrorInNumberExponents,
              allowed_error_is_absolute: allowedErrorIsAbsolute,
            });
          };
          let equality = me.equalSpecifiedSignErrors(expr_b, expr_a, {
            equalityFunction,
            n_sign_errors: nSignErrorsMatched,
          });
          return { fraction_equal: equality ? 1 : 0 };
        } else {
          let equality = expr_a.equalsViaSyntax(expr_b, {
            allowed_error_in_numbers: allowedErrorInNumbers,
            include_error_in_number_exponents: includeErrorInNumberExponents,
            allowed_error_is_absolute: allowedErrorIsAbsolute,
          });
          return { fraction_equal: equality ? 1 : 0 };
        }
      };
    } else {
      check_equality = function (a, b) {
        let expr_a = a;
        let expr_b = b;
        if (!(a instanceof me.class)) {
          expr_a = me.fromAst(a);
        }
        if (!(b instanceof me.class)) {
          expr_b = me.fromAst(b);
        }

        let aIsDiscreteInfinite =
          Array.isArray(a) && a[0] === 'discrete_infinite_set';
        let bIsDiscreteInfinite =
          Array.isArray(b) && b[0] === 'discrete_infinite_set';

        if (aIsDiscreteInfinite || bIsDiscreteInfinite) {
          let dis = expr_a,
            other = expr_b;
          if (!aIsDiscreteInfinite) {
            dis = expr_b;
            other = expr_a;
          }

          let equality = dis.equalsDiscreteInfinite(other, {
            match_partial: partialMatches,
          });

          if (equality === true) {
            return { fraction_equal: 1 };
          } else if (equality === false) {
            return { fraction_equal: 0 };
          } else {
            return { fraction_equal: equality };
          }
        }

        if (nSignErrorsMatched > 0) {
          // We have to make a deep copy
          // because equalSpecifiedSignErrors does in-place changes of ast
          // (and then undoes them)
          // TODO: is this the best solution?
          expr_b = JSON.parse(JSON.stringify(expr_b), me.reviver);
          let equalityFunction = function (aa, bb) {
            return aa.equals(bb, {
              allowed_error_in_numbers: allowedErrorInNumbers,
              include_error_in_number_exponents: includeErrorInNumberExponents,
              allowed_error_is_absolute: allowedErrorIsAbsolute,
            });
          };
          let equality = me.equalSpecifiedSignErrors(expr_b, expr_a, {
            equalityFunction,
            n_sign_errors: nSignErrorsMatched,
          });
          return { fraction_equal: equality ? 1 : 0 };
        } else {
          let equality = expr_a.equals(expr_b, {
            allowed_error_in_numbers: allowedErrorInNumbers,
            include_error_in_number_exponents: includeErrorInNumberExponents,
            allowed_error_is_absolute: allowedErrorIsAbsolute,
          });
          return { fraction_equal: equality ? 1 : 0 };
        }
      };
    }
  } else {
    check_equality = (a, b) => ({ fraction_equal: deepCompare(a, b) ? 1 : 0 });
  }

  if (haveMathExpressions) {
    // if can convert same type of math-expression
    // change object1 and object2 to array of asts
    // otherwise return that are unequal

    let object1_operator = object1.tree[0];
    let object2_operator = object2.tree[0];

    if (object1_operator === 'vector') {
      // change object1 to array of elements
      object1 = object1.tree.slice(1);

      if (
        object2_operator === 'list' ||
        object2_operator === 'interval' ||
        object2_operator === 'matrix' ||
        object2_operator === 'array' ||
        object2_operator === 'set'
      ) {
        return { fraction_equal: 0 };
      } else if (
        object2_operator === 'tuple' ||
        object2_operator === 'vector'
      ) {
        // since we can convert tuple to vector
        // change object2 to array of selements
        object2 = object2.tree.slice(1);
      } else {
        // since can convert singleton to a vector of length 1
        // make object2 array of the one element
        object2 = [object2.tree];
      }
    } else if (object2_operator === 'vector') {
      // change object2 to array of elements
      object2 = object2.tree.slice(1);

      if (
        object1_operator === 'list' ||
        object1_operator === 'interval' ||
        object1_operator === 'matrix' ||
        object1_operator === 'array' ||
        object1_operator === 'set'
      ) {
        return { fraction_equal: 0 };
      } else if (object1_operator === 'tuple') {
        // since can convert tuple to vector
        // change object2 to array of elements
        object1 = object1.tree.slice(1);
      } else {
        // since can convert singleton to a vector of length 1
        // make object1 array of the one element
        object1 = [object1.tree];
      }
    } else if (object1_operator === 'interval') {
      matchExactLocations = true;

      let closedInfo = object1.tree[2];
      let leftClosed = closedInfo[1];
      let rightClosed = closedInfo[2];

      // change object to be the array of the interval endpoints
      object1 = object1.tree[1].slice(1);

      if (
        object2_operator === 'list' ||
        object2_operator === 'matrix' ||
        object2_operator === 'set'
      ) {
        return { fraction_equal: 0 };
      } else if (object2_operator === 'tuple') {
        let operands = object2.tree.slice(1);
        if (
          operands.length === 2 &&
          leftClosed === false &&
          rightClosed === false
        ) {
          // since can convert tuple to open interval
          // and object1 is open interval
          // make object2 be array of endpoints
          object2 = operands;
        } else {
          return { fraction_equal: 0 };
        }
      } else if (object2_operator === 'array') {
        let operands = object2.tree.slice(1);
        if (
          operands.length === 2 &&
          leftClosed === true &&
          rightClosed === true
        ) {
          // since can convert array to closed interval
          // and object1 is closed interval
          // make object2 be array of endpoints
          object2 = operands;
        } else {
          return { fraction_equal: 0 };
        }
      } else if (object2_operator === 'interval') {
        let closedInfo2 = object2.tree[2];
        if (closedInfo2[1] !== leftClosed || closedInfo2[2] !== rightClosed) {
          return { fraction_equal: 0 };
        }
        // convert object2 to array of endpoints
        object2 = object2.tree[1].slice(1);
      } else {
        // can't convert anything else to interval
        return { fraction_equal: 0 };
      }
    } else if (object2_operator === 'interval') {
      matchExactLocations = true;

      let closedInfo = object2.tree[2];
      let leftClosed = closedInfo[1];
      let rightClosed = closedInfo[2];

      // change object to be the array of the interval endpoints
      object2 = object2.tree[1].slice(1);

      if (
        object1_operator === 'list' ||
        object1_operator === 'matrix' ||
        object1_operator === 'set'
      ) {
        return { fraction_equal: 0 };
      } else if (object1_operator === 'tuple') {
        let operands = object1.tree.slice(1);
        if (
          operands.length === 2 &&
          leftClosed === false &&
          rightClosed === false
        ) {
          // since can convert tuple to open interval
          // and object2 is open interval
          // make object1 be array of endpoints
          object1 = operands;
        } else {
          return { fraction_equal: 0 };
        }
      } else if (object1_operator === 'array') {
        let operands = object1.tree.slice(1);
        if (
          operands.length === 2 &&
          leftClosed === true &&
          rightClosed === true
        ) {
          // since can convert array to closed interval
          // and object2 is closed interval
          // make object1 be array of endpoints
          object1 = operands;
        } else {
          return { fraction_equal: 0 };
        }
      } else {
        // can't convert anything else to interval
        return { fraction_equal: 0 };
      }
    } else if (object1_operator === 'matrix') {
      if (object2_operator === 'matrix') {
        // convert to array of matrix rows
        object1 = object1.tree.slice(1);
        object2 = object2.tree.slice(1);
      } else {
        return { fraction_equal: 0 };
      }
    } else if (object2_operator === 'matrix') {
      return { fraction_equal: 0 };
    } else if (object1_operator === 'set') {
      let distinctElements = [];
      for (let v of object1.tree.slice(1)) {
        // if v doesn't match any previous elements, add to array
        if (
          !distinctElements.some(
            (x) => check_equality(x, v).fraction_equal === 1,
          )
        ) {
          distinctElements.push(v);
        }
      }
      object1 = distinctElements;
      isUnordered = true;
      if (
        object2_operator === 'tuple' ||
        object2_operator === 'array' ||
        object2_operator === 'list'
      ) {
        return { fraction_equal: 0 };
      } else if (object2_operator === 'set') {
        distinctElements = [];
        for (let v of object2.tree.slice(1)) {
          // if v doesn't match any previous elements, add to array
          if (
            !distinctElements.some(
              (x) => check_equality(x, v).fraction_equal === 1,
            )
          ) {
            distinctElements.push(v);
          }
        }
        object2 = distinctElements;
      } else {
        // since can convert singleton to a set of length 1
        // make object2 array of the one element
        object2 = [object2.tree];
      }
    } else if (object2_operator === 'set') {
      let distinctElements = [];
      for (let v of object2.tree.slice(1)) {
        // if v doesn't match any previous elements, add to array
        if (
          !distinctElements.some(
            (x) => check_equality(x, v).fraction_equal === 1,
          )
        ) {
          distinctElements.push(v);
        }
      }
      object2 = distinctElements;
      isUnordered = true;
      if (
        object1_operator === 'tuple' ||
        object1_operator === 'array' ||
        object1_operator === 'list'
      ) {
        return { fraction_equal: 0 };
      } else {
        // since can convert singleton to a set of length 1
        // make object1 array of the one element
        object1 = [object1.tree];
      }
    } else if (object1_operator === 'list') {
      object1 = object1.tree.slice(1);
      if (object2_operator === 'tuple' || object2_operator === 'array') {
        return { fraction_equal: 0 };
      } else if (object2_operator === 'list') {
        object2 = object2.tree.slice(1);
      } else {
        // since can convert singleton to a list of length 1
        // make object2 array of the one element
        object2 = [object2.tree];
      }
    } else if (object2_operator === 'list') {
      object2 = object2.tree.slice(1);
      if (object1_operator === 'tuple' || object1_operator === 'array') {
        return { fraction_equal: 0 };
      } else {
        // since can convert singleton to a list of length 1
        // make object1 array of the one element
        object1 = [object1.tree];
      }
    } else if (object1_operator === 'tuple') {
      object1 = object1.tree.slice(1);
      if (object2_operator === 'array') {
        return { fraction_equal: 0 };
      } else if (object2_operator === 'tuple') {
        object2 = object2.tree.slice(1);
      } else {
        // since can convert singleton to a tuple of length 1
        // make object2 array of the one element
        object2 = [object2.tree];
      }
    } else if (object2_operator === 'tuple') {
      object2 = object2.tree.slice(1);
      if (object1_operator === 'array') {
        return { fraction_equal: 0 };
      } else {
        // since can convert singleton to a tuple of length 1
        // make object1 array of the one element
        object1 = [object1.tree];
      }
    } else if (object1_operator === 'array') {
      object1 = object1.tree.slice(1);
      if (object2_operator === 'array') {
        object2 = object2.tree.slice(1);
      } else {
        // since can convert singleton to an array of length 1
        // make object2 array of the one element
        object2 = [object2.tree];
      }
    } else if (object2_operator === 'array') {
      object2 = object2.tree.slice(1);
      // since can convert singleton to an array of length 1
      // make object1 array of the one element
      object1 = [object1.tree];
    } else {
      // neither object is a container type, just return usual equality
      return check_equality(object1.tree, object2.tree);
    }
  } else {
    // don't have math expression, just see if have an array of objects
    if (Array.isArray(object1)) {
      if (!Array.isArray(object2)) {
        // convert to array of one element
        object2 = [object2];
      }
    } else if (Array.isArray(object2)) {
      // convert to array of one element
      object1 = [object1];
    } else {
      // non-array.  Just return if same object
      return check_equality(object1, object2);
    }
  }

  let nelts1 = object1.length;
  let nelts2 = object2.length;

  let results = { fraction_equal: 0 };

  if (matchExactLocations) {
    isUnordered = false;
  }

  // if isUnordered isn't set, demand exact equality
  if (!isUnordered) {
    // check how many elements match in order from the beginning
    let n_matches = 0;

    let minN = Math.min(nelts1, nelts2);
    for (let i = 0; i < minN; i++) {
      let sub_results = check_equality(object1[i], object2[i]);
      n_matches += sub_results.fraction_equal;
    }

    //if object lengths are equal and all match, then exact equality
    if (nelts1 === nelts2 && nelts1 === n_matches) {
      results['fraction_equal'] = 1;
      return results;
    }

    if (!partialMatches) {
      return results; // return failure
    }

    // if match_exact locations, get partial credit only
    // from matching entries in same locations
    if (matchExactLocations) {
      results['fraction_equal'] = n_matches / Math.max(nelts1, nelts2);
      return results;
    }

    // if partial matches, find length of largest common subsequence

    // C is a matrix where the [i][j] element represents the best
    // score achieved from a subsequence using
    // the first i components of object1 and
    // the first j components of object2
    // In the end C[nelts1][nelts2] will be the total score

    // 2D array of zeros from https://stackoverflow.com/a/46792350
    let C = Array.from(Array(nelts1 + 1), (_) => Array(nelts2 + 1).fill(0));

    for (let i = 0; i < nelts1; i++) {
      for (let j = 0; j < nelts2; j++) {
        let sub_results = check_equality(object1[i], object2[j]);

        C[i + 1][j + 1] = Math.max(
          C[i][j] + sub_results.fraction_equal,
          C[i + 1][j],
          C[i][j + 1],
        );
      }
    }

    let max_matched = C[nelts1][nelts2];

    results['fraction_equal'] = max_matched / Math.max(nelts1, nelts2);

    return results;
  }

  // if not ordered, check if match with any order

  // loop through all elements of tuple 1
  // for each element, look for a matching element of tuple 2
  // that has not been used yet.
  let object2_indices_used = new Set();
  let n_matches = 0;
  for (let expr1 of object1) {
    let best_match_ind = -1;
    let best_match = 0;

    for (let [i, expr2] of object2.entries()) {
      if (object2_indices_used.has(i)) {
        continue;
      }

      let sub_results = check_equality(expr1, expr2);

      if (sub_results.fraction_equal > best_match) {
        best_match = sub_results.fraction_equal;
        best_match_ind = i;
      }
    }

    if (best_match_ind !== -1) {
      n_matches += best_match;
      object2_indices_used.add(best_match_ind);
    }
  }

  if (nelts1 === nelts2 && nelts1 === n_matches) {
    results['fraction_equal'] = 1;
  }

  if (!partialMatches) {
    return results;
  }

  results['fraction_equal'] = n_matches / Math.max(nelts1, nelts2);

  return results;
}
