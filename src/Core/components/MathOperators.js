import MathBaseOperator from './abstract/MathBaseOperator';
import MathBaseOperatorOneInput from './abstract/MathBaseOperatorOneInput';
import me from 'math-expressions';

export class Sum extends MathBaseOperator {
  static componentType = 'sum';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          numericOperator: function (inputs) {
            return inputs.reduce((a, c) => a + c);
          },
        },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (inputs) {
            return inputs.reduce((a, c) => a.add(c));
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Product extends MathBaseOperator {
  static componentType = 'product';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          numericOperator: function (inputs) {
            return inputs.reduce((a, c) => a * c);
          },
        },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (values) {
            return values.reduce((a, c) => a.multiply(c));
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class ClampNumber extends MathBaseOperatorOneInput {
  static componentType = 'clampNumber';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.lowerValue = {
      createComponentOfType: 'number',
      createStateVariable: 'lowerValue',
      defaultValue: 0,
      public: true,
    };
    attributes.upperValue = {
      createComponentOfType: 'number',
      createStateVariable: 'upperValue',
      defaultValue: 1,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.isNumericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { isNumericOperator: true } }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({
        lowerValue: {
          dependencyType: 'stateVariable',
          variableName: 'lowerValue',
        },
        upperValue: {
          dependencyType: 'stateVariable',
          variableName: 'upperValue',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          mathOperator: function (value) {
            return clamp({
              value,
              lowerValue: dependencyValues.lowerValue,
              upperValue: dependencyValues.upperValue,
            });
          },
        },
      }),
    };

    stateVariableDefinitions.inverseMathOperator = {
      returnDependencies: () => ({
        lowerValue: {
          dependencyType: 'stateVariable',
          variableName: 'lowerValue',
        },
        upperValue: {
          dependencyType: 'stateVariable',
          variableName: 'upperValue',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          inverseMathOperator: function (value) {
            return clamp({
              value,
              lowerValue: dependencyValues.lowerValue,
              upperValue: dependencyValues.upperValue,
            });
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

function clamp({ value, lowerValue, upperValue }) {
  let numericValue = value;
  if (numericValue instanceof me.class) {
    numericValue = numericValue.evaluate_to_constant();
  }
  if (!Number.isFinite(numericValue)) {
    return me.fromAst(NaN);
  }
  return me.fromAst(Math.max(lowerValue, Math.min(upperValue, numericValue)));
}

export class WrapNumberPeriodic extends MathBaseOperatorOneInput {
  static componentType = 'wrapNumberPeriodic';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.lowerValue = {
      createComponentOfType: 'number',
      createStateVariable: 'lowerValue',
      defaultValue: 0,
      public: true,
    };
    attributes.upperValue = {
      createComponentOfType: 'number',
      createStateVariable: 'upperValue',
      defaultValue: 1,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.isNumericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { isNumericOperator: true } }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({
        lowerValue: {
          dependencyType: 'stateVariable',
          variableName: 'lowerValue',
        },
        upperValue: {
          dependencyType: 'stateVariable',
          variableName: 'upperValue',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          mathOperator: function (value) {
            return makePeriodic({
              value,
              lowerValue: dependencyValues.lowerValue,
              upperValue: dependencyValues.upperValue,
            });
          },
        },
      }),
    };

    stateVariableDefinitions.inverseMathOperator = {
      returnDependencies: () => ({
        lowerValue: {
          dependencyType: 'stateVariable',
          variableName: 'lowerValue',
        },
        upperValue: {
          dependencyType: 'stateVariable',
          variableName: 'upperValue',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          inverseMathOperator: function (value) {
            return makePeriodic({
              value,
              lowerValue: dependencyValues.lowerValue,
              upperValue: dependencyValues.upperValue,
            });
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

function makePeriodic({ value, lowerValue, upperValue }) {
  let numericValue = value;
  if (numericValue instanceof me.class) {
    numericValue = numericValue.evaluate_to_constant();
  }

  if (!Number.isFinite(numericValue)) {
    return me.fromAst(NaN);
  }

  // if bounds are the same, clamp to that value
  if (lowerValue === upperValue) {
    return me.fromAst(lowerValue);
  }

  // just in case lowerValue is larger than upperValue, swap values
  if (lowerValue > upperValue) {
    [upperValue, lowerValue] = [lowerValue, upperValue];
  }

  return me.fromAst(
    lowerValue +
      me.math.mod(numericValue - lowerValue, upperValue - lowerValue),
  );
}

export class Round extends MathBaseOperatorOneInput {
  static componentType = 'round';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.numberDecimals = {
      createComponentOfType: 'number',
      createStateVariable: 'numberDecimals',
      defaultValue: 0,
      public: true,
    };
    attributes.numberDigits = {
      createComponentOfType: 'number',
      createStateVariable: 'numberDigits',
      defaultValue: null,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({
        numberDecimals: {
          dependencyType: 'stateVariable',
          variableName: 'numberDecimals',
        },
        numberDigits: {
          dependencyType: 'stateVariable',
          variableName: 'numberDigits',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          mathOperator: function (value) {
            // first convert all numbers and constants (such as pi) to floating point numbers
            let valueWithNumbers = value.evaluate_numbers({
              max_digits: Infinity,
              evaluate_functions: true,
            });

            if (dependencyValues.numberDigits !== null) {
              return valueWithNumbers.round_numbers_to_precision(
                dependencyValues.numberDigits,
              );
            } else {
              return valueWithNumbers.round_numbers_to_decimals(
                dependencyValues.numberDecimals,
              );
            }
          },
        },
      }),
    };

    stateVariableDefinitions.inverseMathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          inverseMathOperator: (value) => value,
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class ConvertSetToList extends MathBaseOperatorOneInput {
  static componentType = 'convertSetToList';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    delete attributes.unordered;
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.unordered = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { unordered: true },
        makeEssential: { unordered: true },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (value) {
            if (
              value !== undefined &&
              Array.isArray(value.tree) &&
              value.tree[0] === 'set'
            ) {
              let distinctElements = [];
              for (let v of value.tree.slice(1)) {
                // if v doesn't match any previous elements, add to array
                if (
                  !distinctElements.some((x) =>
                    value.context.equalsViaSyntax(
                      value.context.fromAst(x),
                      value.context.fromAst(v),
                    ),
                  )
                ) {
                  distinctElements.push(v);
                }
              }
              return value.context.fromAst(['list', ...distinctElements]);
            }

            return value;
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Ceil extends MathBaseOperatorOneInput {
  static componentType = 'ceil';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (value) {
            let numericValue = value.evaluate_to_constant();

            // if don't have a number, just return value unchanged
            // TODO: is this the right behavior?
            if (!Number.isFinite(numericValue)) {
              return value;
            }

            // to account for roundoff error, if within rounding error of integer, use that
            let rounded = Math.round(numericValue);
            if (Math.abs((rounded - numericValue) / numericValue) < 1e-15) {
              return me.fromAst(rounded);
            }

            return me.fromAst(Math.ceil(numericValue));
          },
        },
      }),
    };

    stateVariableDefinitions.inverseMathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          inverseMathOperator: (value) => value,
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Floor extends MathBaseOperatorOneInput {
  static componentType = 'floor';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (value) {
            let numericValue = value.evaluate_to_constant();

            // if don't have a number, just return value unchanged
            // TODO: is this the right behavior?
            if (!Number.isFinite(numericValue)) {
              return value;
            }

            // to account for roundoff error, if within rounding error of integer, use that
            let rounded = Math.round(numericValue);
            if (Math.abs((rounded - numericValue) / numericValue) < 1e-15) {
              return me.fromAst(rounded);
            }

            return me.fromAst(Math.floor(numericValue));
          },
        },
      }),
    };

    stateVariableDefinitions.inverseMathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          inverseMathOperator: (value) => value,
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Abs extends MathBaseOperatorOneInput {
  static componentType = 'abs';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (value) {
            // TODO: is this the right behavior?
            // or should <abs>log(5)</abs> yield |log(5)|?
            let numericValue = value.evaluate_to_constant();

            // if don't have a number, just return symbolic absolute value
            if (!Number.isFinite(numericValue)) {
              return me.fromAst(['apply', 'abs', value.tree]);
            }

            return me.fromAst(Math.abs(numericValue));
          },
        },
      }),
    };

    stateVariableDefinitions.inverseMathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          inverseMathOperator: function (value) {
            let desiredValue = value;
            let valueNumeric = value.evaluate_to_constant();
            if (Number.isFinite(valueNumeric)) {
              if (valueNumeric < 0) {
                desiredValue = me.fromAst(0);
              }
            }
            return desiredValue;
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Mean extends MathBaseOperator {
  static componentType = 'mean';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          numericOperator: function (inputs) {
            let mean = inputs.reduce((a, c) => a + c);
            mean /= inputs.length;
            return mean;
          },
        },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (inputs) {
            return inputs.reduce((a, c) => a.add(c)).divide(inputs.length);
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Variance extends MathBaseOperator {
  static componentType = 'variance';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.population = {
      createComponentOfType: 'boolean',
      createStateVariable: 'population',
      defaultValue: false,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({
        population: {
          dependencyType: 'stateVariable',
          variableName: 'population',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          numericOperator: function (inputs) {
            return calculateNumericVariance(
              inputs,
              dependencyValues.population,
            );
          },
        },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({
        population: {
          dependencyType: 'stateVariable',
          variableName: 'population',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          mathOperator: function (inputs) {
            return calculateSymbolicVariance(
              inputs,
              dependencyValues.population,
            );
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

function calculateNumericVariance(inputs, population) {
  let sum = 0,
    variance = 0;
  for (let num of inputs) {
    sum += num;
    variance += num * num;
  }

  let n = inputs.length;
  // variance /= n;

  variance -= sum ** 2 / n;

  if (population) {
    variance /= n;
  } else {
    variance /= n - 1;
  }
  return variance;
}

function calculateSymbolicVariance(inputs, population) {
  let n = inputs.length;

  let sum = inputs.reduce((a, c) => a.add(c));

  let variance = inputs
    .slice(1)
    .reduce((a, c) => a.add(c.pow(2)), inputs[0].pow(2))
    .subtract(sum.pow(2).divide(n));

  if (population) {
    variance = variance.divide(n);
  } else {
    variance = variance.divide(n - 1);
  }

  return variance;
}

export class StandardDeviation extends Variance {
  static componentType = 'standardDeviation';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator.definition = ({
      dependencyValues,
    }) => ({
      newValues: {
        numericOperator: function (inputs) {
          return Math.sqrt(
            calculateNumericVariance(inputs, dependencyValues.population),
          );
        },
      },
    });

    stateVariableDefinitions.mathOperator.definition = ({
      dependencyValues,
    }) => ({
      newValues: {
        mathOperator: function (inputs) {
          return me.fromAst([
            'apply',
            'sqrt',
            calculateSymbolicVariance(inputs, dependencyValues.population).tree,
          ]);
        },
      },
    });

    return stateVariableDefinitions;
  }
}

export class Count extends MathBaseOperator {
  static componentType = 'count';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.isNumericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { isNumericOperator: true } }),
    };

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          numericOperator: function (inputs) {
            return inputs.length;
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Min extends MathBaseOperator {
  static componentType = 'min';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          numericOperator: function (inputs) {
            return inputs.reduce((a, c) => Math.min(a, c), Infinity);
          },
        },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (inputs) {
            return me.fromAst([
              'apply',
              'min',
              ['tuple', ...inputs.map((x) => x.tree)],
            ]);
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Max extends MathBaseOperator {
  static componentType = 'max';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          numericOperator: function (inputs) {
            return inputs.reduce((a, c) => Math.max(a, c), -Infinity);
          },
        },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (inputs) {
            return me.fromAst([
              'apply',
              'max',
              ['tuple', ...inputs.map((x) => x.tree)],
            ]);
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

export class Mod extends MathBaseOperator {
  static componentType = 'mod';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          numericOperator: function (inputs) {
            if (inputs.length !== 2) {
              return NaN;
            }
            return me.math.mod(inputs[0], inputs[1]);
          },
        },
      }),
    };

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: {
          mathOperator: function (inputs) {
            if (inputs.length !== 2) {
              return me.fromAst('\uff3f');
            }
            return me.fromAst([
              'apply',
              'mod',
              ['tuple', ...inputs.map((x) => x.tree)],
            ]);
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}
