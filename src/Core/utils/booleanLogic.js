import checkEquality from './checkEquality';
import me from 'math-expressions';
import { textToAst } from './math';

export function evaluateLogic({
  logicTree,
  unorderedCompare = false,
  simplifyOnCompare = false,
  expandOnCompare = false,
  dependencyValues,
}) {
  let evaluateSub = (x) =>
    evaluateLogic({
      logicTree: x,
      unorderedCompare,
      simplifyOnCompare,
      expandOnCompare,
      dependencyValues,
    });

  if (!Array.isArray(logicTree)) {
    // if don't have an array, then the only valid option is that the tree
    // is a single boolean component

    // TODO: should have a flag where one can set <when> to substitute math children at the beginning?
    // this would allow one to specify logic operators in the math
    // but it would prevent one from comparing expressions involving those operators

    if (typeof logicTree === 'string') {
      let booleanChild = dependencyValues.booleanChildrenByCode[logicTree];
      if (booleanChild) {
        return booleanChild.stateValues.value ? 1 : 0;
      } else {
        let mathChild = dependencyValues.mathChildrenByCode[logicTree];
        if (mathChild) {
          // TODO: should we simplify before evaluating to constant?
          let numericalValue = mathChild.stateValues.value
            .simplify()
            .evaluate_to_constant();
          if (Number.isFinite(numericalValue) && numericalValue !== 0) {
            return 1;
          } else {
            return 0;
          }
        } else if (logicTree.toLowerCase() === 'true') {
          return 1;
        } else if (logicTree.toLowerCase() === 'false') {
          return 0;
        }
      }
    } else if (typeof logicTree === 'number') {
      return logicTree === 0 ? 0 : 1;
    }

    console.warn('Invalid format for boolean condition');
    return 0;
  }

  let operator = logicTree[0];
  let operands = logicTree.slice(1);

  if (operator === 'not') {
    if (operands.length !== 1) {
      console.warn('Invalid format for boolean condition');
      return 0;
    }
    return evaluateSub(operands[0]) === 0 ? 1 : 0;
  }
  if (operator === 'and') {
    if (dependencyValues.matchPartial) {
      return operands.reduce((a, c) => a + evaluateSub(c), 0) / operands.length;
    } else {
      return operands.every((x) => evaluateSub(x) === 1) ? 1 : 0;
    }
  }
  if (operator === 'or') {
    if (dependencyValues.matchPartial) {
      return operands.reduce((a, c) => Math.max(evaluateSub(c), a), 0);
    } else {
      return operands.some((x) => evaluateSub(x) === 1) ? 1 : 0;
    }
  }

  let foundMath = false;
  let foundText = false;
  let foundBoolean = false;

  operands.forEach(
    function (x) {
      if (typeof x === 'string') {
        if (
          x in dependencyValues.mathChildrenByCode ||
          x in dependencyValues.mathListChildrenByCode
        ) {
          foundMath = true;
        } else if (
          x in dependencyValues.textChildrenByCode ||
          x in dependencyValues.textListChildrenByCode
        ) {
          foundText = true;
        } else if (
          x in dependencyValues.booleanChildrenByCode ||
          x in dependencyValues.booleanListChildrenByCode
        ) {
          foundBoolean = true;
        }
      }
    }.bind(this),
  );

  let replaceMath = function (tree) {
    if (typeof tree === 'string') {
      let child = dependencyValues.mathChildrenByCode[tree];
      if (child !== undefined) {
        return child.stateValues.value.tree;
      }
      child = dependencyValues.mathListChildrenByCode[tree];
      if (child !== undefined) {
        return ['list', ...child.stateValues.maths.map((x) => x.tree)];
      }
      return tree;
    }
    if (!Array.isArray(tree)) {
      return tree;
    }

    return [tree[0], ...tree.slice(1).map(replaceMath)];
  }.bind(this);

  if (operator === 'apply' && ['isnumber', 'isinteger'].includes(operands[0])) {
    if (foundText || foundBoolean) {
      return 0;
    }

    // try to see if operand can be evaluated to a number
    let expression = me.fromAst(replaceMath(operands[1]));

    // TODO: should we simplify before evaluating to constant?
    let numericalValue = expression.simplify().evaluate_to_constant();

    if (!Number.isFinite(numericalValue)) {
      return 0;
    }

    if (operands[0] === 'isnumber') {
      return 1;
    } else {
      // to account for round off error, round to nearest integer
      // and check if close to that integer
      let rounded = Math.round(numericalValue);
      if (
        Math.abs(rounded - numericalValue) <=
        1e-15 * Math.abs(numericalValue)
      ) {
        return 1;
      } else {
        return 0;
      }
    }
  }

  // TODO: other set operations

  if (
    !['=', 'ne', '<', '>', 'le', 'ge', 'lts', 'gts', 'in', 'notin'].includes(
      operator,
    )
  ) {
    if (foundText || foundBoolean) {
      console.warn('Invalid format for boolean condition');
      return 0;
    }

    // try to see if logic tree can be evaluated to a number
    let expression = me.fromAst(replaceMath(logicTree));

    // TODO: should we simplify before evaluating to constant?
    let numericalValue = expression.simplify().evaluate_to_constant();
    if (Number.isFinite(numericalValue) && numericalValue !== 0) {
      return 1;
    } else {
      return 0;
    }
  }

  if (foundBoolean) {
    if (foundMath || foundText) {
      console.warn('Invalid format for boolean condition');
      return 0;
    }

    let foundInvalidWhen = false;
    // every operand must be a boolean, booleanstring, or a string that is true or false
    operands = operands.map(
      function (x) {
        if (typeof x === 'string') {
          let child = dependencyValues.booleanChildrenByCode[x];
          if (child !== undefined) {
            return child.stateValues.value;
          }
          child = dependencyValues.booleanListChildrenByCode[x];
          if (child !== undefined) {
            return child.stateValues.booleans;
          }
          x = x.toLowerCase().trim();
          if (x === 'true' || x === 't') {
            return true;
          }
          if (x === 'false' || x === 'f') {
            return false;
          }
          console.warn('Invalid format for boolean condition');
          foundInvalidWhen = true;
          return 0;
        }
        console.warn('Invalid format for boolean condition');
        foundInvalidWhen = true;
        return 0;
      }.bind(this),
    );

    if (foundInvalidWhen) {
      return 0;
    }

    if (operator === '=') {
      let boolean1 = operands[0];
      if (dependencyValues.matchPartial) {
        let results = operands.slice(1).map((x) =>
          checkEquality({
            object1: boolean1,
            object2: x,
            isUnordered: unorderedCompare,
            partialMatches: dependencyValues.matchPartial,
          }),
        );

        // return average of fraction_equal
        let sum = results.reduce((a, c) => a + c.fraction_equal, 0);
        return sum / results.length;
      } else {
        return operands.slice(1).every(
          (x) =>
            checkEquality({
              object1: boolean1,
              object2: x,
              isUnordered: unorderedCompare,
              partialMatches: dependencyValues.matchPartial,
            }).fraction_equal === 1,
        )
          ? 1
          : 0;
      }
    } else if (operator === 'ne') {
      if (operands.length !== 2) {
        console.warn('Invalid format for boolean condition');
        return 0;
      }
      let fraction_equal = checkEquality({
        object1: operands[0],
        object2: operands[1],
        isUnordered: unorderedCompare,
        partialMatches: dependencyValues.matchPartial,
      }).fraction_equal;

      return fraction_equal === 0 ? 1 : 0;
    } else {
      console.warn('Invalid format for boolean condition');
      return 0;
    }
  } else if (foundText) {
    if (foundMath) {
      console.warn('Invalid format for boolean condition');
      return 0;
    }

    let foundInvalidWhen = false;

    let extractText = function (tree, recurse = false) {
      if (typeof tree === 'string') {
        let child = dependencyValues.textChildrenByCode[tree];
        if (child !== undefined) {
          return child.stateValues.value.trim();
        }
        child = dependencyValues.textListChildrenByCode[tree];
        if (child !== undefined) {
          return child.stateValues.texts.map((x) => x.trim());
        }
        return tree.trim();
      }

      // multiple words would become multiplication
      if (!(recurse && Array.isArray(tree) && tree[0] === '*')) {
        console.warn('Invalid format for boolean condition');
        foundInvalidWhen = true;
        return '';
      }

      return tree.slice(1).map(extractText).join(' ');
    }.bind(this);

    // every operand must be a text or string that is true or false
    operands = operands.map((x) => extractText(x, true));

    if (foundInvalidWhen) {
      return 0;
    }

    if (operator === '=') {
      let text1 = operands[0];
      if (dependencyValues.matchPartial) {
        let results = operands.slice(1).map((x) =>
          checkEquality({
            object1: text1,
            object2: x,
            isUnordered: unorderedCompare,
            partialMatches: dependencyValues.matchPartial,
          }),
        );

        // return average of fraction_equal
        let sum = results.reduce((a, c) => a + c.fraction_equal, 0);
        return sum / results.length;
      } else {
        return operands.slice(1).every(
          (x) =>
            checkEquality({
              object1: text1,
              object2: x,
              isUnordered: unorderedCompare,
              partialMatches: dependencyValues.matchPartial,
            }).fraction_equal === 1,
        )
          ? 1
          : 0;
      }
    } else if (operator === 'ne') {
      if (operands.length !== 2) {
        console.warn('Invalid format for boolean condition');
        return 0;
      }

      let fraction_equal = checkEquality({
        object1: operands[0],
        object2: operands[1],
        isUnordered: unorderedCompare,
        partialMatches: dependencyValues.matchPartial,
      }).fraction_equal;

      return fraction_equal === 0 ? 1 : 0;
    } else {
      console.warn('Invalid format for boolean condition');
      return 0;
    }
  }

  // no boolean or text, just math, mathList, and strings

  let strict;
  if (operator === 'lts' || operator === 'gts') {
    strict = operands[1].slice(1);
    operands = operands[0].slice(1);
  }

  operands = operands.map(function (x) {
    return me.fromAst(replaceMath(x));
  });

  if (operator === '=') {
    let expr = operands[0];
    if (dependencyValues.matchPartial) {
      let results = operands.slice(1).map((x) =>
        checkEquality({
          object1: expr,
          object2: x,
          isUnordered: unorderedCompare,
          partialMatches: dependencyValues.matchPartial,
          symbolicEquality: dependencyValues.symbolicEquality,
          simplify: simplifyOnCompare,
          expand: expandOnCompare,
          allowedErrorInNumbers: dependencyValues.allowedErrorInNumbers,
          includeErrorInNumberExponents:
            dependencyValues.includeErrorInNumberExponents,
          allowedErrorIsAbsolute: dependencyValues.allowedErrorIsAbsolute,
          nSignErrorsMatched: dependencyValues.nSignErrorsMatched,
        }),
      );

      // return average of fraction_equal
      let sum = results.reduce((a, c) => a + c.fraction_equal, 0);
      return sum / results.length;
    } else {
      return operands.slice(1).every(
        (x) =>
          checkEquality({
            object1: expr,
            object2: x,
            isUnordered: unorderedCompare,
            partialMatches: dependencyValues.matchPartial,
            symbolicEquality: dependencyValues.symbolicEquality,
            simplify: simplifyOnCompare,
            expand: expandOnCompare,
            allowedErrorInNumbers: dependencyValues.allowedErrorInNumbers,
            includeErrorInNumberExponents:
              dependencyValues.includeErrorInNumberExponents,
            allowedErrorIsAbsolute: dependencyValues.allowedErrorIsAbsolute,
            nSignErrorsMatched: dependencyValues.nSignErrorsMatched,
          }).fraction_equal === 1,
      )
        ? 1
        : 0;
    }
  }
  if (operator === 'ne') {
    let fraction_equal = checkEquality({
      object1: operands[0],
      object2: operands[1],
      isUnordered: unorderedCompare,
      partialMatches: dependencyValues.matchPartial,
      symbolicEquality: dependencyValues.symbolicEquality,
      simplify: simplifyOnCompare,
      expand: expandOnCompare,
      allowedErrorInNumbers: dependencyValues.allowedErrorInNumbers,
      includeErrorInNumberExponents:
        dependencyValues.includeErrorInNumberExponents,
      allowedErrorIsAbsolute: dependencyValues.allowedErrorIsAbsolute,
      nSignErrorsMatched: dependencyValues.nSignErrorsMatched,
    }).fraction_equal;

    return fraction_equal === 0 ? 1 : 0;
  }

  if (operator === 'in' || operator === 'notin') {
    let element = operands[0];
    let set = operands[1];
    let set_tree = set.tree;
    if (!(Array.isArray(set_tree) && set_tree[0] === 'set')) {
      console.warn('Invalid format for boolean condition');
      return 0;
    }

    if (dependencyValues.matchPartial) {
      let results = set_tree.slice(1).map((x) =>
        checkEquality({
          object1: element,
          object2: me.fromAst(x),
          isUnordered: unorderedCompare,
          partialMatches: dependencyValues.matchPartial,
          symbolicEquality: dependencyValues.symbolicEquality,
          simplify: simplifyOnCompare,
          expand: expandOnCompare,
          allowedErrorInNumbers: dependencyValues.allowedErrorInNumbers,
          includeErrorInNumberExponents:
            dependencyValues.includeErrorInNumberExponents,
          allowedErrorIsAbsolute: dependencyValues.allowedErrorIsAbsolute,
          nSignErrorsMatched: dependencyValues.nSignErrorsMatched,
        }),
      );

      let max_fraction = results.reduce(
        (a, c) => Math.max(a, c.fraction_equal),
        0,
      );
      if (operator === 'in') {
        return max_fraction;
      } else {
        return 1 - max_fraction;
      }
    } else {
      let result = set_tree.slice(1).some(
        (x) =>
          checkEquality({
            object1: element,
            object2: me.fromAst(x),
            isUnordered: unorderedCompare,
            partialMatches: dependencyValues.matchPartial,
            symbolicEquality: dependencyValues.symbolicEquality,
            simplify: simplifyOnCompare,
            expand: expandOnCompare,
            allowedErrorInNumbers: dependencyValues.allowedErrorInNumbers,
            includeErrorInNumberExponents:
              dependencyValues.includeErrorInNumberExponents,
            allowedErrorIsAbsolute: dependencyValues.allowedErrorIsAbsolute,
            nSignErrorsMatched: dependencyValues.nSignErrorsMatched,
          }).fraction_equal === 1,
      );

      if (operator === 'in') {
        return result ? 1 : 0;
      } else {
        return result ? 0 : 1;
      }
    }
  }

  // since have inequality, all operands must be numbers
  operands = operands.map((x) => x.simplify().evaluate_to_constant());
  if (operands.some((x) => x === null || Number.isNaN(x))) {
    return 0;
  }

  // at this point, all operands are numbers, Infinity, or -Infinity

  if (operator === '<') {
    return operands[0] < operands[1] ? 1 : 0;
  } else if (operator === '>') {
    return operands[0] > operands[1] ? 1 : 0;
  } else if (operator === 'le') {
    return operands[0] <= operands[1] ? 1 : 0;
  } else if (operator === 'ge') {
    return operands[0] >= operands[1] ? 1 : 0;
  }

  // have lts or gts
  for (let ind = 0; ind < strict.length; ind++) {
    if (operator === 'lts') {
      if (strict[ind] === true) {
        if (!(operands[ind] < operands[ind + 1])) {
          return 0;
        }
      } else {
        if (!(operands[ind] <= operands[ind + 1])) {
          return 0;
        }
      }
    } else {
      if (strict[ind] === true) {
        if (!(operands[ind] > operands[ind + 1])) {
          return 0;
        }
      } else {
        if (!(operands[ind] >= operands[ind + 1])) {
          return 0;
        }
      }
    }
  }
  // all inequalities satisfied
  return 1;
}

export function splitSymbolsIfMath({
  logicTree,
  nonMathCodes,
  foundNonMath = false,
  init = true,
}) {
  if (!Array.isArray(logicTree)) {
    if (typeof logicTree === 'string' && !foundNonMath && !init) {
      return me.fromAst(textToAst.convert(logicTree)).tree; // split string
    } else {
      return logicTree;
    }
  }

  let operator = logicTree[0];
  let operands = logicTree.slice(1);

  if (['and', 'not', 'or'].includes(operator)) {
    if (operator === 'apply') {
      return [
        operator,
        operands[0],
        ...operands.slice(1).map((x) =>
          splitSymbolsIfMath({
            logicTree: x,
            nonMathCodes,
            foundNonMath,
            init,
          }),
        ),
      ];
    } else {
      return [
        operator,
        ...operands.map((x) =>
          splitSymbolsIfMath({
            logicTree: x,
            nonMathCodes,
            foundNonMath,
            init,
          }),
        ),
      ];
    }
  }

  if (operands.some((x) => nonMathCodes.includes(x))) {
    foundNonMath = true;
  }

  if (operator === 'apply') {
    return [
      operator,
      operands[0],
      ...operands.slice(1).map((x) =>
        splitSymbolsIfMath({
          logicTree: x,
          nonMathCodes,
          foundNonMath,
          init: false,
        }),
      ),
    ];
  } else {
    return [
      operator,
      ...operands.map((x) =>
        splitSymbolsIfMath({
          logicTree: x,
          nonMathCodes,
          foundNonMath,
          init: false,
        }),
      ),
    ];
  }
}
