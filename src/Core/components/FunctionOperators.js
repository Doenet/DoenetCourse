import FunctionBaseOperator from './abstract/FunctionBaseOperator';
import me from 'math-expressions';

export class ClampFunction extends FunctionBaseOperator {
  static componentType = 'clampFunction';

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

  static returnStateVariableDefinitions({ numerics }) {
    let stateVariableDefinitions = super.returnStateVariableDefinitions({
      numerics,
    });

    stateVariableDefinitions.numericalFunctionOperator = {
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
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            numericalFunctionOperator: function (x) {
              // if don't have a number, return NaN
              if (!Number.isFinite(x)) {
                return NaN;
              }
              return Math.max(
                dependencyValues.lowerValue,
                Math.min(dependencyValues.upperValue, x),
              );
            },
          },
        };
      },
    };

    stateVariableDefinitions.symbolicFunctionOperator = {
      returnDependencies: () => ({
        numericalFunctionOperator: {
          dependencyType: 'stateVariable',
          variableName: 'numericalFunctionOperator',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            symbolicFunctionOperator: (x) =>
              me.fromAst(
                dependencyValues.numericalFunctionOperator(
                  x.evaluate_to_constant(),
                ),
              ),
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}

export class WrapFunctionPeriodic extends FunctionBaseOperator {
  static componentType = 'wrapFunctionPeriodic';

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

  static returnStateVariableDefinitions({ numerics }) {
    let stateVariableDefinitions = super.returnStateVariableDefinitions({
      numerics,
    });

    stateVariableDefinitions.numericalFunctionOperator = {
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
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            numericalFunctionOperator: function (x) {
              // if don't have a number, return NaN
              if (!Number.isFinite(x)) {
                return NaN;
              }

              let lower = dependencyValues.lowerValue;
              let upper = dependencyValues.upperValue;

              // if bounds are the same, clamp to that value
              if (lower === upper) {
                return lower;
              }

              // just in case lower is larger than upper, swap values
              if (lower > upper) {
                [upper, lower] = [lower, upper];
              }

              return lower + me.math.mod(x - lower, upper - lower);
            },
          },
        };
      },
    };

    stateVariableDefinitions.symbolicFunctionOperator = {
      returnDependencies: () => ({
        numericalFunctionOperator: {
          dependencyType: 'stateVariable',
          variableName: 'numericalFunctionOperator',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            symbolicFunctionOperator: (x) =>
              me.fromAst(
                dependencyValues.numericalFunctionOperator(
                  x.evaluate_to_constant(),
                ),
              ),
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}

export class Derivative extends FunctionBaseOperator {
  static componentType = 'derivative';

  static returnStateVariableDefinitions({ numerics }) {
    let stateVariableDefinitions = super.returnStateVariableDefinitions({
      numerics,
    });

    stateVariableDefinitions.operatorBasedOnFormulaIfAvailable = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { operatorBasedOnFormulaIfAvailable: true },
      }),
    };

    stateVariableDefinitions.operatorComposesWithOriginal = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { operatorComposesWithOriginal: false },
      }),
    };

    stateVariableDefinitions.formulaOperator = {
      returnDependencies: () => ({
        variable: {
          dependencyType: 'stateVariable',
          variableName: 'variable',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            formulaOperator: function (formula) {
              return formula.derivative(dependencyValues.variable.tree);
            },
          },
        };
      },
    };

    stateVariableDefinitions.numericalFunctionOperator = {
      returnDependencies: () => ({
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunctionForOperator',
          variableNames: ['returnNumericalDerivatives'],
          variablesOptional: true,
        },
      }),
      additionalStateVariablesDefined: ['returnNumericalDerivatives'],
      definition: function ({ dependencyValues }) {
        if (
          dependencyValues.functionChild.length === 0 ||
          !dependencyValues.functionChild[0].stateValues
            .returnNumericalDerivatives
        ) {
          return {
            newValues: {
              numericalFunctionOperator: (x) => NaN,
              returnNumericalDerivatives: null,
            },
          };
        }

        return {
          newValues: {
            numericalFunctionOperator:
              dependencyValues.functionChild[0].stateValues.returnNumericalDerivatives(
                1,
              ),
            returnNumericalDerivatives: (i = 1) =>
              dependencyValues.functionChild[0].stateValues.returnNumericalDerivatives(
                i + 1,
              ),
          },
        };
      },
    };

    stateVariableDefinitions.symbolicFunctionOperator = {
      returnDependencies: () => ({
        numericalFunctionOperator: {
          dependencyType: 'stateVariable',
          variableName: 'numericalFunctionOperator',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            symbolicFunctionOperator: (x) =>
              me.fromAst(
                dependencyValues.numericalFunctionOperator(
                  x.evaluate_to_constant(),
                ),
              ),
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
