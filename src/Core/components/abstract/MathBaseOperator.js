import MathComponent from '../Math';
import me from 'math-expressions';

export default class MathOperator extends MathComponent {
  static componentType = '_mathOperator';
  static rendererType = 'math';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.forceSymbolic = {
      createComponentOfType: 'boolean',
      createStateVariable: 'forceSymbolic',
      defaultValue: false,
      public: true,
    };
    attributes.forceNumeric = {
      createComponentOfType: 'boolean',
      createStateVariable: 'forceNumeric',
      defaultValue: false,
      public: true,
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakStringsIntoMathsBySpaces = function ({ matchedChildren }) {
      // break any string by white space and wrap pieces with math or number

      let newChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => ({
                componentType: Number.isFinite(Number(s)) ? 'number' : 'math',
                children: [{ componentType: 'string', state: { value: s } }],
              })),
          ];
        } else {
          return [...a, c];
        }
      }, []);

      return {
        success: true,
        newChildren: newChildren,
      };
    };

    sugarInstructions.push({
      replacementFunction: breakStringsIntoMathsBySpaces,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.deleteAllLogic();

    let atLeastZeroMaths = childLogic.newLeaf({
      name: 'atLeastZeroMaths',
      componentType: 'math',
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroNumbers = childLogic.newLeaf({
      name: 'atLeastZeroNumbers',
      componentType: 'number',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'mathsAndNumbers',
      operator: 'and',
      propositions: [atLeastZeroMaths, atLeastZeroNumbers],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.isNumericOperator = {
      returnDependencies: () => ({
        forceNumeric: {
          dependencyType: 'stateVariable',
          variableName: 'forceNumeric',
        },
        forceSymbolic: {
          dependencyType: 'stateVariable',
          variableName: 'forceSymbolic',
        },
        mathChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroMaths',
          variableNames: ['isNumber'],
          variablesOptional: true,
        },
      }),
      definition({ dependencyValues }) {
        let isNumericOperator;
        if (dependencyValues.forceNumeric) {
          isNumericOperator = true;
        } else if (dependencyValues.forceSymbolic) {
          isNumericOperator = false;
        } else if (dependencyValues.mathChildren.length === 0) {
          isNumericOperator = true;
        } else {
          // have math children and aren't forced to be numeric or symbolic
          // will be numeric only if have all math children are numbers
          isNumericOperator = dependencyValues.mathChildren.every(
            (x) => x.stateValues.isNumber,
          );
        }

        return { newValues: { isNumericOperator } };
      },
    };

    delete stateVariableDefinitions.codePre;
    delete stateVariableDefinitions.expressionWithCodes;
    delete stateVariableDefinitions.codesAdjacentToStrings;
    delete stateVariableDefinitions.mathChildrenByArrayComponent;

    stateVariableDefinitions.mathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { mathOperator: (x) => me.fromAst('\uff3f') },
      }),
    };

    stateVariableDefinitions.numericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { numericOperator: (x) => me.fromAst('\uff3f') },
      }),
    };

    stateVariableDefinitions.inverseMathOperator = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { inverseMathOperator: null } }),
    };

    stateVariableDefinitions.inverseNumericOperator = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { inverseNumericOperator: null } }),
    };

    stateVariableDefinitions.unnormalizedValue = {
      returnDependencies: () => ({
        mathNumberChildren: {
          dependencyType: 'child',
          childLogicName: 'mathsAndNumbers',
          variableNames: ['value'],
        },
        isNumericOperator: {
          dependencyType: 'stateVariable',
          variableName: 'isNumericOperator',
        },
        mathOperator: {
          dependencyType: 'stateVariable',
          variableName: 'mathOperator',
        },
        numericOperator: {
          dependencyType: 'stateVariable',
          variableName: 'numericOperator',
        },
        inverseMathOperator: {
          dependencyType: 'stateVariable',
          variableName: 'inverseMathOperator',
        },
        inverseNumericOperator: {
          dependencyType: 'stateVariable',
          variableName: 'inverseNumericOperator',
        },
      }),
      definition: function ({ dependencyValues, componentInfoObjects }) {
        if (dependencyValues.mathNumberChildren.length === 0) {
          return {
            newValues: { unnormalizedValue: me.fromAst('\uff3f') },
          };
        } else if (dependencyValues.isNumericOperator) {
          let inputs = [];
          for (let child of dependencyValues.mathNumberChildren) {
            if (
              componentInfoObjects.isInheritedComponentType({
                inheritedComponentType: child.componentType,
                baseComponentType: 'number',
              })
            ) {
              inputs.push(child.stateValues.value);
            } else {
              let value = child.stateValues.value.evaluate_to_constant();
              if (!Number.isFinite(value)) {
                value = NaN;
              }
              inputs.push(value);
            }
          }

          return {
            newValues: {
              unnormalizedValue: me.fromAst(
                dependencyValues.numericOperator(inputs),
              ),
            },
          };
        } else {
          let inputs = [];
          for (let child of dependencyValues.mathNumberChildren) {
            if (
              componentInfoObjects.isInheritedComponentType({
                inheritedComponentType: child.componentType,
                baseComponentType: 'number',
              })
            ) {
              inputs.push(me.fromAst(child.stateValues.value));
            } else {
              inputs.push(child.stateValues.value);
            }
          }

          return {
            newValues: {
              unnormalizedValue: dependencyValues.mathOperator(inputs),
            },
          };
        }
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
      }) {
        if (dependencyValues.mathNumberChildren.length === 0) {
          return { success: false };
        } else if (dependencyValues.isNumericOperator) {
          if (dependencyValues.inverseNumericOperator) {
            let inputs = [];
            for (let child of dependencyValues.mathNumberChildren) {
              if (
                componentInfoObjects.isInheritedComponentType({
                  inheritedComponentType: child.componentType,
                  baseComponentType: 'number',
                })
              ) {
                inputs.push(child.stateValues.value);
              } else {
                let value = child.stateValues.value.evaluate_to_constant();
                if (!Number.isFinite(value)) {
                  value = NaN;
                }
                inputs.push(value);
              }
            }
            let results = dependencyValues.inverseNumericOperator({
              desiredValue:
                desiredStateVariableValues.unnormalizedValue.evaluate_to_constant(),
              inputs,
            });

            if (results.success) {
              return {
                success: true,
                instructions: [
                  {
                    setDependency: 'mathNumberChildren',
                    desiredValue: results.inputValue,
                    childIndex: results.inputNumber,
                    variableIndex: 0,
                  },
                ],
              };
            } else {
              return { success: false };
            }
          } else {
            return { success: false };
          }
        } else if (dependencyValues.inverseMathOperator) {
          let inputs = [];
          for (let child of dependencyValues.mathNumberChildren) {
            if (
              componentInfoObjects.isInheritedComponentType({
                inheritedComponentType: child.componentType,
                baseComponentType: 'number',
              })
            ) {
              inputs.push(me.fromAst(child.stateValues.value));
            } else {
              inputs.push(child.stateValues.value);
            }
          }

          let results = dependencyValues.inverseMathOperator({
            desiredValue: desiredStateVariableValues.unnormalizedValue,
            inputs,
          });

          if (results.success) {
            return {
              success: true,
              instructions: [
                {
                  setDependency: 'mathNumberChildren',
                  desiredValue: results.inputValue,
                  childIndex: results.inputNumber,
                  variableIndex: 0,
                },
              ],
            };
          } else {
            return { success: false };
          }
        } else {
          return { success: false };
        }
      },
    };

    // create new version on canBeModified that is true only if
    // there is just one child
    // and we have a inverseMathOperator/inverseNumberOperator
    // if don't have reverseMathOperator
    stateVariableDefinitions.canBeModified = {
      returnDependencies: () => ({
        modifyIndirectly: {
          dependencyType: 'stateVariable',
          variableName: 'modifyIndirectly',
        },
        fixed: {
          dependencyType: 'stateVariable',
          variableName: 'fixed',
        },
        mathNumberChildren: {
          dependencyType: 'child',
          childLogicName: 'mathsAndNumbers',
        },
        isNumericOperator: {
          dependencyType: 'stateVariable',
          variableName: 'isNumericOperator',
        },
        inverseMathOperator: {
          dependencyType: 'stateVariable',
          variableName: 'mathOperator',
        },
        inverseNumericOperator: {
          dependencyType: 'stateVariable',
          variableName: 'inverseNumericOperator',
        },
      }),
      definition: function ({ dependencyValues }) {
        let canBeModified =
          dependencyValues.modifyIndirectly &&
          !dependencyValues.fixed &&
          dependencyValues.mathNumberChildren.length === 1 &&
          (dependencyValues.isNumericOperator
            ? dependencyValues.inverseNumericOperator
            : dependencyValues.inverseMathOperator);

        return { newValues: { canBeModified } };
      },
    };

    return stateVariableDefinitions;
  }
}
