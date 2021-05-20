import InlineComponent from './abstract/InlineComponent';
import me from 'math-expressions';
import {
  mathStateVariableFromNumberStateVariable,
  roundForDisplay,
  textToAst,
} from '../utils/math';

export default class NumberComponent extends InlineComponent {
  static componentType = 'number';

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['value'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.displayDigits = {
      createComponentOfType: 'number',
      createStateVariable: 'displayDigits',
      defaultValue: 10,
      public: true,
    };
    attributes.displaySmallAsZero = {
      createComponentOfType: 'boolean',
      createStateVariable: 'displaySmallAsZero',
      defaultValue: false,
      public: true,
    };
    attributes.displayDecimals = {
      createComponentOfType: 'number',
      createStateVariable: 'displayDecimals',
      defaultValue: null,
      public: true,
    };
    attributes.renderAsMath = {
      createComponentOfType: 'boolean',
      createStateVariable: 'renderAsMath',
      defaultValue: false,
      public: true,
      forRenderer: true,
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    // add math around multiple children
    // math will be adapted to a number
    sugarInstructions.push({
      childrenRegex: /..+/,
      replacementFunction: ({ matchedChildren }) => ({
        success: true,
        newChildren: [{ componentType: 'math', children: matchedChildren }],
      }),
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atMostOneString = childLogic.newLeaf({
      name: 'atMostOneString',
      componentType: 'string',
      comparison: 'atMost',
      number: 1,
    });
    let exactlyOneNumber = childLogic.newLeaf({
      name: 'exactlyOneNumber',
      componentType: 'number',
      number: 1,
    });

    childLogic.newOperator({
      name: 'stringXorNumberXorSugar',
      operator: 'xor',
      propositions: [exactlyOneNumber, atMostOneString],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.value = {
      public: true,
      componentType: this.componentType,
      returnDependencies: () => ({
        numberChild: {
          dependencyType: 'child',
          childLogicName: 'exactlyOneNumber',
          variableNames: ['value', 'canBeModified'],
        },
        stringChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneString',
          variableNames: ['value'],
        },
      }),
      defaultValue: NaN,
      definition: function ({ dependencyValues }) {
        if (dependencyValues.numberChild.length === 0) {
          if (dependencyValues.stringChild.length === 0) {
            return {
              useEssentialOrDefaultValue: {
                value: { variablesToCheck: ['value'] },
              },
            };
          }
          let number = Number(
            dependencyValues.stringChild[0].stateValues.value,
          );
          if (Number.isNaN(number)) {
            try {
              number = me
                .fromAst(
                  textToAst.convert(
                    dependencyValues.stringChild[0].stateValues.value,
                  ),
                )
                .evaluate_to_constant();
              if (number === null) {
                number = NaN;
              }
            } catch (e) {
              number = NaN;
            }
          }
          return { newValues: { value: number } };
        } else {
          return {
            newValues: {
              value: dependencyValues.numberChild[0].stateValues.value,
            },
          };
        }
      },
      set: function (value) {
        // this function is called when
        // - definition is overridden by a ref prop
        // - when processing new state variable values
        //   (which could be from outside sources)
        let number = Number(value);
        if (Number.isNaN(number)) {
          try {
            number = me
              .fromAst(textToAst.convert(value))
              .evaluate_to_constant();
            if (number === null) {
              number = NaN;
            }
          } catch (e) {
            number = NaN;
          }
        }
        return number;
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
        overrideFixed,
      }) {
        if (!stateValues.canBeModified && !overrideFixed) {
          return { success: false };
        }

        let desiredValue = desiredStateVariableValues.value;
        if (desiredValue instanceof me.class) {
          desiredValue = desiredValue.evaluate_to_constant();
          if (!Number.isFinite(desiredValue)) {
            desiredValue = NaN;
          }
        } else {
          desiredValue = Number(desiredValue);
        }

        let instructions;

        if (dependencyValues.numberChild.length === 0) {
          if (dependencyValues.stringChild.length === 0) {
            instructions = [
              {
                setStateVariable: 'value',
                value: desiredValue,
              },
            ];
          } else {
            // TODO: would it be more efficient to defer setting value of string?
            instructions = [
              {
                setDependency: 'stringChild',
                desiredValue: desiredValue.toString(),
                childIndex: 0,
                variableIndex: 0,
              },
            ];
          }
        } else {
          instructions = [
            {
              setDependency: 'numberChild',
              desiredValue: desiredValue,
              childIndex: 0,
              variableIndex: 0,
            },
          ];
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.valueForDisplay = {
      forRenderer: true,
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
        displayDigits: {
          dependencyType: 'stateVariable',
          variableName: 'displayDigits',
        },
        displaySmallAsZero: {
          dependencyType: 'stateVariable',
          variableName: 'displaySmallAsZero',
        },
        displayDecimals: {
          dependencyType: 'stateVariable',
          variableName: 'displayDecimals',
        },
      }),
      definition: function ({ dependencyValues, usedDefault }) {
        // for display via latex and text, round any decimal numbers to the significant digits
        // determined by displaydigits
        let rounded = roundForDisplay({
          value: dependencyValues.value,
          dependencyValues,
          usedDefault,
        });

        if (rounded instanceof me.class) {
          rounded = rounded.tree;
        }

        return {
          newValues: {
            valueForDisplay: rounded,
          },
        };
      },
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        valueForDisplay: {
          dependencyType: 'stateVariable',
          variableName: 'valueForDisplay',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { text: dependencyValues.valueForDisplay.toString() },
        };
      },
    };

    stateVariableDefinitions.math = mathStateVariableFromNumberStateVariable({
      numberVariableName: 'value',
      mathVariableName: 'math',
      public: true,
    });

    // Note: don't need canBeModified for number logic, as core will already
    // be able to determine from modifyIndirectly and fixed that it cannot be modified
    // However, include this state variable for case when number is included in math
    stateVariableDefinitions.canBeModified = {
      returnDependencies: () => ({
        numberChildModifiable: {
          dependencyType: 'child',
          childLogicName: 'exactlyOneNumber',
          variableNames: ['canBeModified'],
        },
        modifyIndirectly: {
          dependencyType: 'stateVariable',
          variableName: 'modifyIndirectly',
        },
        fixed: {
          dependencyType: 'stateVariable',
          variableName: 'fixed',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (!dependencyValues.modifyIndirectly || dependencyValues.fixed) {
          return { newValues: { canBeModified: false } };
        }

        if (
          dependencyValues.numberChildModifiable.length === 1 &&
          !dependencyValues.numberChildModifiable[0].stateValues.canBeModified
        ) {
          return { newValues: { canBeModified: false } };
        }

        return { newValues: { canBeModified: true } };
      },
    };

    return stateVariableDefinitions;
  }

  // returnSerializeInstructions() {
  //   let stringMatches = this.childLogic.returnMatches("atMostOneString");
  //   let skipChildren = stringMatches && stringMatches.length === 1;
  //   if (skipChildren) {
  //     let stateVariables = ["value"];
  //     return { skipChildren, stateVariables };
  //   }
  //   return {};
  // }

  static adapters = ['math', 'text'];
}
