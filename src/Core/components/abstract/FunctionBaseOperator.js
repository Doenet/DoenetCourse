import Function, {
  returnSymbolicFunctionFromFormula,
  returnNumericalFunctionFromFormula,
} from '../Function';
import me from 'math-expressions';

export default class FunctionOperator extends Function {
  static componentType = '_functionOperator';

  static returnSugarInstructions() {
    let sugarInstructions = [];

    sugarInstructions.push({
      childrenRegex: /s/,
      replacementFunction: ({ matchedChildren }) => ({
        success: true,
        newChildren: [
          {
            componentType: 'math',
            children: matchedChildren,
          },
        ],
      }),
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.deleteAllLogic();

    let exactlyOneMath = childLogic.newLeaf({
      name: 'exactlyOneMath',
      componentType: 'math',
      number: 1,
    });

    let atMostOneFunctionForOperator = childLogic.newLeaf({
      name: 'atMostOneFunctionForOperator',
      componentType: 'function',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'functionXorMath',
      operator: 'xor',
      propositions: [exactlyOneMath, atMostOneFunctionForOperator],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions({ numerics }) {
    let stateVariableDefinitions = super.returnStateVariableDefinitions({
      numerics,
    });

    stateVariableDefinitions.isInterpolatedFunction = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { isInterpolatedFunction: false } }),
    };

    delete stateVariableDefinitions.nPrescribedPoints;
    delete stateVariableDefinitions.prescribedPoints;
    delete stateVariableDefinitions.prescribedMinima;
    delete stateVariableDefinitions.prescribedMaxima;
    delete stateVariableDefinitions.prescribedExtrema;
    delete stateVariableDefinitions.interpolationPoints;
    delete stateVariableDefinitions.xs;

    let originalVariableReturnDependences =
      stateVariableDefinitions.variable.returnDependencies;
    stateVariableDefinitions.variable.returnDependencies = function () {
      let dependencies = originalVariableReturnDependences();
      dependencies.functionChild.childLogicName =
        'atMostOneFunctionForOperator';
      return dependencies;
    };

    let originalSymbolicReturnDependences =
      stateVariableDefinitions.symbolic.returnDependencies;
    stateVariableDefinitions.symbolic.returnDependencies = function () {
      let dependencies = originalSymbolicReturnDependences();
      dependencies.functionChild.childLogicName =
        'atMostOneFunctionForOperator';
      return dependencies;
    };

    stateVariableDefinitions.operatorBasedOnFormulaIfAvailable = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { operatorBasedOnFormulaIfAvailable: false },
      }),
    };

    stateVariableDefinitions.formula.returnDependencies = () => ({});
    stateVariableDefinitions.formula.definition = () => ({
      newValues: { formula: me.fromAst('\uff3f') },
    });

    stateVariableDefinitions.operatorComposesWithOriginal = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { operatorComposesWithOriginal: true } }),
    };

    stateVariableDefinitions.symbolicFunctionOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { symbolicFunctionOperator: (x) => me.fromAst('\uff3f') },
      }),
    };

    stateVariableDefinitions.numericalFunctionOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { numericalFunctionOperator: (x) => NaN },
      }),
    };

    stateVariableDefinitions.formulaOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { formulaOperator: (x) => me.fromAst('\uff3f') },
      }),
    };

    stateVariableDefinitions.returnNumericalDerivatives = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { returnNumericalDerivatives: null } }),
    };

    stateVariableDefinitions.formula = {
      public: true,
      componentType: 'formula',
      additionalStateVariablesDefined: ['operatorBasedOnFormula'],
      // stateVariablesDeterminingDependencies: ["operatorBasedOnFormulaIfAvailable"],
      returnDependencies: () => ({
        operatorBasedOnFormulaIfAvailable: {
          dependencyType: 'stateVariable',
          variableName: 'operatorBasedOnFormulaIfAvailable',
        },
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunctionForOperator',
          variableNames: ['formula'],
        },
        mathChild: {
          dependencyType: 'child',
          childLogicName: 'exactlyOneMath',
          variableNames: ['value'],
        },
        formulaOperator: {
          dependencyType: 'stateVariable',
          variableName: 'formulaOperator',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (
          !dependencyValues.operatorBasedOnFormulaIfAvailable ||
          ((dependencyValues.functionChild.length === 0 ||
            dependencyValues.functionChild[0].stateValues.formula.tree ===
              '\uff3f') &&
            (dependencyValues.mathChild.length === 0 ||
              dependencyValues.mathChild[0].stateValues.value.tree ===
                '\uff3f'))
        ) {
          return {
            newValues: {
              formula: me.fromAst('\uff3f'),
              operatorBasedOnFormula: false,
            },
          };
        }

        let formulaPreOperator;

        if (dependencyValues.functionChild.length === 0) {
          formulaPreOperator = dependencyValues.mathChild[0].stateValues.value;
        } else {
          formulaPreOperator =
            dependencyValues.functionChild[0].stateValues.formula;
        }
        return {
          newValues: {
            formula: dependencyValues.formulaOperator(formulaPreOperator),
            operatorBasedOnFormula: true,
          },
        };
      },
    };

    stateVariableDefinitions.symbolicf = {
      returnDependencies: () => ({
        operatorBasedOnFormula: {
          dependencyType: 'stateVariable',
          variableName: 'operatorBasedOnFormula',
        },
        formula: {
          dependencyType: 'stateVariable',
          variableName: 'formula',
        },
        variable: {
          dependencyType: 'stateVariable',
          variableName: 'variable',
        },
        simplify: {
          dependencyType: 'stateVariable',
          variableName: 'simplify',
        },
        expand: {
          dependencyType: 'stateVariable',
          variableName: 'expand',
        },
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunctionForOperator',
          variableNames: ['symbolicf'],
        },
        mathChild: {
          dependencyType: 'child',
          childLogicName: 'exactlyOneMath',
          variableNames: ['value'],
        },
        symbolicFunctionOperator: {
          dependencyType: 'stateVariable',
          variableName: 'symbolicFunctionOperator',
        },
        operatorComposesWithOriginal: {
          dependencyType: 'stateVariable',
          variableName: 'operatorComposesWithOriginal',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.operatorBasedOnFormula) {
          return {
            newValues: {
              symbolicf: returnSymbolicFunctionFromFormula(dependencyValues),
            },
          };
        } else if (dependencyValues.operatorComposesWithOriginal) {
          if (dependencyValues.functionChild.length === 0) {
            if (dependencyValues.mathChild.length === 0) {
              return {
                newValues: { symbolicf: (x) => me.fromAst('\uff3f') },
              };
            } else {
              let dependencyValuesWithChildFormula = Object.assign(
                {},
                dependencyValues,
              );
              dependencyValuesWithChildFormula.formula =
                dependencyValues.mathChild[0].stateValues.value;

              let childF = returnSymbolicFunctionFromFormula(dependencyValues);
              return {
                newValues: {
                  symbolicf: (x) =>
                    dependencyValues.symbolicFunctionOperator(childF(x)),
                },
              };
            }
          } else {
            let childF =
              dependencyValues.functionChild[0].stateValues.symbolicf;
            return {
              newValues: {
                symbolicf: (x) =>
                  dependencyValues.symbolicFunctionOperator(childF(x)),
              },
            };
          }
        } else {
          return {
            newValues: {
              symbolicf: function (x) {
                return dependencyValues.symbolicFunctionOperator(x);
              },
            },
          };
        }
      },
    };

    stateVariableDefinitions.numericalf = {
      returnDependencies: () => ({
        operatorBasedOnFormula: {
          dependencyType: 'stateVariable',
          variableName: 'operatorBasedOnFormula',
        },
        formula: {
          dependencyType: 'stateVariable',
          variableName: 'formula',
        },
        variable: {
          dependencyType: 'stateVariable',
          variableName: 'variable',
        },
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunctionForOperator',
          variableNames: ['numericalf'],
        },
        mathChild: {
          dependencyType: 'child',
          childLogicName: 'exactlyOneMath',
          variableNames: ['value'],
        },
        numericalFunctionOperator: {
          dependencyType: 'stateVariable',
          variableName: 'numericalFunctionOperator',
        },
        operatorComposesWithOriginal: {
          dependencyType: 'stateVariable',
          variableName: 'operatorComposesWithOriginal',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.operatorBasedOnFormula) {
          return {
            newValues: {
              numericalf: returnNumericalFunctionFromFormula(dependencyValues),
            },
          };
        } else if (dependencyValues.operatorComposesWithOriginal) {
          if (dependencyValues.functionChild.length === 0) {
            if (dependencyValues.mathChild.length === 0) {
              return {
                newValues: { numericalf: (x) => NaN },
              };
            } else {
              let dependencyValuesWithChildFormula = Object.assign(
                {},
                dependencyValues,
              );
              dependencyValuesWithChildFormula.formula =
                dependencyValues.mathChild[0].stateValues.value;

              let childF = returnNumericalFunctionFromFormula(dependencyValues);
              return {
                newValues: {
                  numericalf: (x) =>
                    dependencyValues.numericalFunctionOperator(childF(x)),
                },
              };
            }
          } else {
            let childF =
              dependencyValues.functionChild[0].stateValues.numericalf;
            return {
              newValues: {
                numericalf: (x) =>
                  dependencyValues.numericalFunctionOperator(childF(x)),
              },
            };
          }
        } else {
          return {
            newValues: {
              numericalf: function (x) {
                return dependencyValues.numericalFunctionOperator(x);
              },
            },
          };
        }
      },
    };

    // make functionChild null
    // as base Function component uses it to determine if extrema
    // should depend on a function child
    stateVariableDefinitions.functionChild = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { functionChild: null } }),
    };

    // remove function child dependency from minima
    stateVariableDefinitions.allMinima.returnDependencies = () => ({
      numericalf: {
        dependencyType: 'stateVariable',
        variableName: 'numericalf',
      },
      xscale: {
        dependencyType: 'stateVariable',
        variableName: 'xscale',
      },
    });

    // remove function child dependency from maxima
    stateVariableDefinitions.allMaxima.returnDependencies = () => ({
      numericalf: {
        dependencyType: 'stateVariable',
        variableName: 'numericalf',
      },
      xscale: {
        dependencyType: 'stateVariable',
        variableName: 'xscale',
      },
    });

    return stateVariableDefinitions;
  }
}
