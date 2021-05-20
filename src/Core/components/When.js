import BooleanComponent from './Boolean';

import me from 'math-expressions';
import { evaluateLogic } from '../utils/booleanLogic';

export default class When extends BooleanComponent {
  static componentType = 'when';
  static rendererType = undefined;

  static stateVariableForAttributeValue = 'conditionSatisfied';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.matchPartial = {
      createComponentOfType: 'boolean',
      createStateVariable: 'matchPartial',
      defaultValue: false,
      public: true,
    };
    attributes.symbolicEquality = {
      createComponentOfType: 'boolean',
      createStateVariable: 'symbolicEquality',
      defaultValue: false,
      public: true,
    };
    attributes.expandOnCompare = {
      createComponentOfType: 'boolean',
      createStateVariable: 'expandOnCompare',
      defaultValue: false,
      public: true,
      propagateToDescendants: true,
    };
    attributes.simplifyOnCompare = {
      createComponentOfType: 'text',
      createStateVariable: 'simplifyOnCompare',
      defaultValue: 'none',
      toLowerCase: true,
      valueTransformations: { '': 'full', true: 'full' },
      validValues: ['none', 'full', 'numbers', 'numbersepreserveorder'],
      public: true,
      propagateToDescendants: true,
    };
    attributes.unorderedCompare = {
      createComponentOfType: 'boolean',
      createStateVariable: 'unorderedCompare',
      defaultValue: false,
      public: true,
      propagateToDescendants: true,
    };
    attributes.allowedErrorInNumbers = {
      createComponentOfType: 'number',
      createStateVariable: 'allowedErrorInNumbers',
      defaultValue: 0,
      public: true,
    };
    attributes.includeErrorInNumberExponents = {
      createComponentOfType: 'boolean',
      createStateVariable: 'includeErrorInNumberExponents',
      defaultValue: false,
      public: true,
    };
    attributes.allowedErrorIsAbsolute = {
      createComponentOfType: 'boolean',
      createStateVariable: 'allowedErrorIsAbsolute',
      defaultValue: false,
      public: true,
    };
    attributes.nSignErrorsMatched = {
      createComponentOfType: 'number',
      createStateVariable: 'nSignErrorsMatched',
      defaultValue: 0,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    // conditional satisfied is just an alias to value
    stateVariableDefinitions.value = {
      additionalStateVariablesDefined: [
        'fractionSatisfied',
        'conditionSatisfied',
      ],
      returnDependencies: () => ({
        matchPartial: {
          dependencyType: 'stateVariable',
          variableName: 'matchPartial',
        },
        symbolicEquality: {
          dependencyType: 'stateVariable',
          variableName: 'symbolicEquality',
        },
        expandOnCompare: {
          dependencyType: 'stateVariable',
          variableName: 'expandOnCompare',
        },
        simplifyOnCompare: {
          dependencyType: 'stateVariable',
          variableName: 'simplifyOnCompare',
        },
        unorderedCompare: {
          dependencyType: 'stateVariable',
          variableName: 'unorderedCompare',
        },
        allowedErrorInNumbers: {
          dependencyType: 'stateVariable',
          variableName: 'allowedErrorInNumbers',
        },
        includeErrorInNumberExponents: {
          dependencyType: 'stateVariable',
          variableName: 'includeErrorInNumberExponents',
        },
        allowedErrorIsAbsolute: {
          dependencyType: 'stateVariable',
          variableName: 'allowedErrorIsAbsolute',
        },
        nSignErrorsMatched: {
          dependencyType: 'stateVariable',
          variableName: 'nSignErrorsMatched',
        },
        parsedExpression: {
          dependencyType: 'stateVariable',
          variableName: 'parsedExpression',
        },
        stringMathTextBooleanChildren: {
          dependencyType: 'child',
          childLogicName: 'stringsMathsTextsAndBooleans',
          variableNames: ['value', 'texts', 'maths', 'unordered'],
          variablesOptional: true,
        },
        mathChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroMaths',
          variableNames: ['value', 'expand', 'simplify'],
        },
        booleanChildrenByCode: {
          dependencyType: 'stateVariable',
          variableName: 'booleanChildrenByCode',
        },
        booleanListChildrenByCode: {
          dependencyType: 'stateVariable',
          variableName: 'booleanListChildrenByCode',
        },
        textChildrenByCode: {
          dependencyType: 'stateVariable',
          variableName: 'textChildrenByCode',
        },
        textListChildrenByCode: {
          dependencyType: 'stateVariable',
          variableName: 'textListChildrenByCode',
        },
        mathChildrenByCode: {
          dependencyType: 'stateVariable',
          variableName: 'mathChildrenByCode',
        },
        mathListChildrenByCode: {
          dependencyType: 'stateVariable',
          variableName: 'mathListChildrenByCode',
        },
      }),
      definition({ dependencyValues, usedDefault }) {
        // evaluate logic in parsedExpression and return fraction correct

        if (dependencyValues.parsedExpression === null) {
          // if don't have parsed expression
          // (which could occur if have no children or if have invalid form)
          // return false
          return {
            newValues: {
              conditionSatisfied: false,
              value: false,
              fractionSatisfied: 0,
            },
          };
        }

        let unorderedCompare = dependencyValues.unorderedCompare;
        let simplifyOnCompare = dependencyValues.simplifyOnCompare;
        let expandOnCompare = dependencyValues.expandOnCompare;

        let canOverrideUnorderedCompare = usedDefault.unorderedCompare;
        let canOverrideSimplifyOnCompare = usedDefault.simplifyOnCompare;
        let canOverrideExpandOnCompare = usedDefault.expandOnCompare;

        // if compare attributes haven't been explicitly prescribed by <when>
        // or one of its ancestors
        // then any of the attributes can be turned on if there is a
        // child with the comparable property

        // check all children for an unordered property
        for (let child of dependencyValues.stringMathTextBooleanChildren) {
          if (canOverrideUnorderedCompare && child.stateValues.unordered) {
            unorderedCompare = true;
          }
        }

        // check math children for additional attributes
        for (let child of dependencyValues.mathChildren) {
          if (canOverrideExpandOnCompare && child.stateValues.expand) {
            expandOnCompare = true;
          }

          if (canOverrideSimplifyOnCompare) {
            if (child.stateValues.simplify === 'full') {
              simplifyOnCompare = 'full';
            } else if (child.stateValues.simplify === 'numbers') {
              if (simplifyOnCompare !== 'full') {
                simplifyOnCompare = 'numbers';
              }
            } else if (child.stateValues.simplify === 'numberspreserveorder') {
              if (
                simplifyOnCompare !== 'full' &&
                simplifyOnCompare !== 'numbers'
              ) {
                simplifyOnCompare = 'numberspreserveorder';
              }
            }
          }
        }

        let fractionSatisfied = evaluateLogic({
          logicTree: dependencyValues.parsedExpression.tree,
          unorderedCompare: unorderedCompare,
          simplifyOnCompare: simplifyOnCompare,
          expandOnCompare: expandOnCompare,
          dependencyValues,
        });

        let conditionSatisfied = fractionSatisfied === 1;

        return {
          newValues: {
            fractionSatisfied,
            conditionSatisfied,
            value: conditionSatisfied,
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
