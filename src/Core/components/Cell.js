import BaseComponent from './abstract/BaseComponent';
import me from 'math-expressions';
import { textToAst } from '../utils/math';

export default class Cell extends BaseComponent {
  static componentType = 'cell';
  static rendererType = 'container';

  static primaryStateVariableForDefinition = 'placeholder';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.rowNum = { default: null };
    attributes.colNum = { default: null };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let exactlyOneMath = childLogic.newLeaf({
      name: 'exactlyOneMath',
      componentType: 'math',
      number: 1,
    });

    let nothingElse = childLogic.newLeaf({
      name: 'nothingElse',
      componentType: '_base',
      number: 0,
      allowSpillover: false,
    });

    let oneMathAndNothingElse = childLogic.newOperator({
      name: 'oneMathAndNothingElse',
      operator: 'and',
      propositions: [exactlyOneMath, nothingElse],
      requireConsecutive: true,
    });

    let anything = childLogic.newLeaf({
      name: 'anything',
      componentType: '_base',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'mathXorAnything',
      operator: 'xor',
      propositions: [oneMathAndNothingElse, anything],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.onlyMathChild = {
      returnDependencies: () => ({
        mathChild: {
          dependencyType: 'child',
          childLogicName: 'oneMathAndNothingElse',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          onlyMathChild: dependencyValues.mathChild.length === 1,
        },
      }),
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      defaultValue: '',
      returnDependencies: () => ({
        children: {
          dependencyType: 'child',
          childLogicName: 'mathXorAnything',
          variableNames: ['text'],
          variablesOptional: true,
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.children.length === 0) {
          return {
            useEssentialOrDefaultValue: {
              text: { variablesToCheck: ['text'] },
            },
          };
        }
        let text = '';
        for (let child of dependencyValues.children) {
          if (child.stateValues.text) {
            text += child.stateValues.text;
          }
        }

        return { newValues: { text } };
      },
      inverseDefinition({ desiredStateVariableValues, dependencyValues }) {
        if (dependencyValues.children.length === 0) {
          return {
            success: true,
            instructions: [
              {
                setStateVariable: 'text',
                value: desiredStateVariableValues.text,
              },
            ],
          };
        } else if (dependencyValues.children.length === 1) {
          if (dependencyValues.children[0].stateValues.text === undefined) {
            return { success: false };
          } else {
            return {
              success: true,
              instructions: [
                {
                  setDependency: 'children',
                  desiredValue: desiredStateVariableValues.text,
                  childIndex: 0,
                  variableIndex: 0,
                },
              ],
            };
          }
        } else {
          return { success: false };
        }
      },
    };

    stateVariableDefinitions.math = {
      public: true,
      componentType: 'math',
      stateVariablesDeterminingDependencies: ['onlyMathChild'],
      returnDependencies({ stateValues }) {
        if (stateValues.onlyMathChild) {
          return {
            mathChild: {
              dependencyType: 'child',
              childLogicName: 'oneMathAndNothingElse',
              variableNames: ['value'],
            },
          };
        } else {
          return {
            text: {
              dependencyType: 'stateVariable',
              variableName: 'text',
            },
          };
        }
      },
      definition({ dependencyValues }) {
        if (dependencyValues.mathChild) {
          return {
            newValues: {
              math: dependencyValues.mathChild[0].stateValues.value,
            },
          };
        } else {
          let math;
          try {
            math = me.fromAst(textToAst.convert(dependencyValues.text));
          } catch (e) {
            math = me.fromAst('\uff3f');
          }

          return { newValues: { math } };
        }
      },
      inverseDefinition({ desiredStateVariableValues, dependencyValues }) {
        if (dependencyValues.mathChild) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'mathChild',
                desiredValue: desiredStateVariableValues.math,
                childIndex: 0,
                variableIndex: 0,
              },
            ],
          };
        } else {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'text',
                desiredValue: desiredStateVariableValues.math.toString(),
              },
            ],
          };
        }
      },
    };

    stateVariableDefinitions.number = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        math: {
          dependencyType: 'stateVariable',
          variableName: 'math',
        },
      }),
      definition({ dependencyValues }) {
        let number = dependencyValues.math.evaluate_to_constant();
        if (!Number.isFinite(number)) {
          number = NaN;
        }
        return { newValues: { number } };
      },
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setDependency: 'math',
              desiredValue: me.fromAst(desiredStateVariableValues.number),
            },
          ],
        };
      },
    };

    stateVariableDefinitions.childrenToRender = {
      returnDependencies: () => ({
        activeChildren: {
          dependencyType: 'child',
          childLogicName: 'mathXorAnything',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            childrenToRender: dependencyValues.activeChildren.map(
              (x) => x.componentName,
            ),
          },
        };
      },
    };

    stateVariableDefinitions.placeholder = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { placeholder: null } }),
    };

    return stateVariableDefinitions;
  }

  static adapters = ['text', 'math', 'number'];
}
