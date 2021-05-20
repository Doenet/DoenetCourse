import BaseComponent from './BaseComponent';
import me from 'math-expressions';
import { convertValueToMathExpression, textToAst } from '../../utils/math';
import { breakEmbeddedStringsIntoParensPieces } from '../commonsugar/breakstrings';

export class ComponentWithSelectableType extends BaseComponent {
  static componentType = '_componentWithSelectableType';
  static rendererType = undefined;

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['value', 'type'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.type = {
      createPrimitiveOfType: 'string',
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = [];

    function addType({
      matchedChildren,
      componentAttributes,
      parentAttributes,
    }) {
      let type = componentAttributes.type;
      if (!type) {
        type = parentAttributes.type;
      }
      if (!type) {
        type = 'number';
      } else if (
        !['number', 'letters', 'math', 'text', 'boolean'].includes(type)
      ) {
        console.warn(`Invalid type ${type}, setting type to number`);
        type = 'number';
      }

      let componentType = type === 'letters' ? 'text' : type;

      return {
        success: true,
        newChildren: [
          {
            componentType,
            children: matchedChildren,
          },
        ],
      };
    }

    sugarInstructions.push({
      replacementFunction: addType,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atMostOneChild',
      componentType: '_base',
      excludeComponentTypes: ['_composite'],
      comparison: 'atMost',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.type = {
      returnDependencies: () => ({
        type: {
          dependencyType: 'doenetAttribute',
          attributeName: 'type',
        },
        parentType: {
          dependencyType: 'parentStateVariable',
          variableName: 'type',
        },
      }),
      definition: function ({ dependencyValues, componentName }) {
        let type = dependencyValues.type;
        if (!type) {
          type = dependencyValues.parentType;
        }
        if (!type) {
          type = 'number';
        } else if (
          !['number', 'letters', 'math', 'text', 'boolean'].includes(type)
        ) {
          console.warn(`Invalid type ${type}, setting type to number`);
          type = 'number';
        }

        return { newValues: { type } };
      },
    };

    stateVariableDefinitions.value = {
      public: true,
      hasVariableComponentType: true,
      returnDependencies: () => ({
        type: {
          dependencyType: 'stateVariable',
          variableName: 'type',
        },
        atMostOneChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneChild',
          variableNames: ['value'],
        },
      }),
      definition({ dependencyValues }) {
        let value;

        if (dependencyValues.atMostOneChild.length === 1) {
          // value = convertValueToType(
          //   dependencyValues.atMostOneChild[0].stateValues.value,
          //   dependencyValues.type
          // );
          value = dependencyValues.atMostOneChild[0].stateValues.value;
        } else {
          value = null;
        }

        return {
          newValues: { value },
          setComponentType: { value: dependencyValues.type },
        };
      },
    };

    return stateVariableDefinitions;
  }
}

export class ComponentListWithSelectableType extends ComponentWithSelectableType {
  static componentType = '_componentListWithSelectableType';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.type = {
      createPrimitiveOfType: 'string',
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = [];

    function breakIntoTypesBySpacesAndAddType({
      matchedChildren,
      componentAttributes,
      parentAttributes,
    }) {
      let type = componentAttributes.type;
      if (!type) {
        type = parentAttributes.type;
      }
      if (!type) {
        type = 'number';
      } else if (
        !['number', 'letters', 'math', 'text', 'boolean'].includes(type)
      ) {
        console.warn(`Invalid type ${type}, setting type to number`);
        type = 'number';
      }

      let componentType = type === 'letters' ? 'text' : type;

      // break any string by white space and wrap with componentType
      matchedChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => ({
                componentType,
                children: [{ componentType: 'string', state: { value: s } }],
              })),
          ];
        } else {
          return [...a, c];
        }
      }, []);

      return {
        success: true,
        newChildren: matchedChildren,
      };
    }

    sugarInstructions.push({
      replacementFunction: breakIntoTypesBySpacesAndAddType,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);
    childLogic.deleteAllLogic();

    childLogic.newLeaf({
      name: 'anythingForSelectedType',
      componentType: '_base',
      excludeComponentTypes: ['_composite'],
      comparison: 'atLeast',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    delete stateVariableDefinitions.value;

    stateVariableDefinitions.nValues = {
      additionalStateVariablesDefined: ['childForValue'],
      returnDependencies: () => ({
        anythingForSelectedType: {
          dependencyType: 'child',
          childLogicName: 'anythingForSelectedType',
          variableNames: ['nValues'],
          variablesOptional: true,
        },
      }),
      definition({ dependencyValues }) {
        let nValues = 0;
        let childForValue = [];
        for (let [
          ind,
          child,
        ] of dependencyValues.anythingForSelectedType.entries()) {
          let n = Number.isInteger(child.stateValues.nValues)
            ? child.stateValues.nValues
            : 1;
          nValues += n;
          for (let i = 0; i < n; i++) {
            childForValue.push({ child: ind, valueIndex: i });
          }
        }
        return {
          newValues: { nValues, childForValue },
        };
      },
    };

    stateVariableDefinitions.values = {
      public: true,
      isArray: true,
      entryPrefixes: ['value'],
      stateVariablesDeterminingDependencies: ['childForValue'],
      hasVariableComponentType: true,
      returnArraySizeDependencies: () => ({
        nValues: {
          dependencyType: 'stateVariable',
          variableName: 'nValues',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nValues];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let globalDependencies = {
          type: {
            dependencyType: 'stateVariable',
            variableName: 'type',
          },
        };

        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let childInfo = stateValues.childForValue[arrayKey];
          dependenciesByKey[arrayKey] = {
            anythingForSelectedType: {
              dependencyType: 'child',
              childLogicName: 'anythingForSelectedType',
              variableNames: ['value', 'values'],
              childIndices: [childInfo.child],
              variablesOptional: true,
            },
            valueIndex: {
              dependencyType: 'value',
              value: childInfo.valueIndex,
            },
          };
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
        componentName,
      }) {
        // console.log(`array definition for value of component list with selectable type, ${componentName}`)
        // console.log(globalDependencyValues)
        // console.log(dependencyValuesByKey);
        // console.log(arrayKeys)

        let values = {};

        for (let arrayKey of arrayKeys) {
          if (
            dependencyValuesByKey[arrayKey].anythingForSelectedType &&
            dependencyValuesByKey[arrayKey].anythingForSelectedType.length === 1
          ) {
            let child =
              dependencyValuesByKey[arrayKey].anythingForSelectedType[0];
            let value;
            if (child.stateValues.values) {
              value =
                child.stateValues.values[
                  dependencyValuesByKey[arrayKey].valueIndex
                ];
            } else {
              value = child.stateValues.value;
            }
            values[arrayKey] = convertValueToType(
              value,
              globalDependencyValues.type,
            );
          }
        }

        return {
          newValues: { values },
          setComponentType: { values: globalDependencyValues.type },
        };
      },
    };

    return stateVariableDefinitions;
  }
}

export class ComponentListOfListsWithSelectableType extends ComponentWithSelectableType {
  static componentType = '_componentListOfListsWithSelectableType';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.type = {
      createPrimitiveOfType: 'string',
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = [];

    let breakIntoListsByParensAndAddType = function ({
      matchedChildren,
      componentAttributes,
      parentAttributes,
    }) {
      let results = breakEmbeddedStringsIntoParensPieces({
        componentList: matchedChildren,
        removeParens: true,
      });

      if (results.success !== true) {
        return { success: false };
      }

      let type = componentAttributes.type;
      if (!type) {
        type = parentAttributes.type;
      }
      if (!type) {
        type = 'number';
      } else if (
        !['number', 'letters', 'math', 'text', 'boolean'].includes(type)
      ) {
        console.warn(`Invalid type ${type}, setting type to number`);
        type = 'number';
      }

      return {
        success: true,
        newChildren: results.pieces.map((x) => ({
          componentType: '_componentListWithSelectableType',
          attributes: { type },
          children: x,
        })),
      };
    };

    sugarInstructions.push({
      replacementFunction: breakIntoListsByParensAndAddType,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);
    childLogic.deleteAllLogic();

    childLogic.newLeaf({
      name: 'atLeastZeroLists',
      componentType: '_componentListWithSelectableType',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    delete stateVariableDefinitions.value;

    stateVariableDefinitions.nLists = {
      returnDependencies: () => ({
        listChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroLists',
        },
      }),
      definition({ dependencyValues }) {
        return { newValues: { nLists: dependencyValues.listChildren.length } };
      },
    };

    stateVariableDefinitions.lists = {
      isArray: true,
      entryPrefixes: ['list'],
      returnArraySizeDependencies: () => ({
        nLists: {
          dependencyType: 'stateVariable',
          variableName: 'nLists',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nLists];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          type: {
            dependencyType: 'stateVariable',
            variableName: 'type',
          },
        };

        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            listChildren: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroLists',
              variableNames: ['values', 'type'],
              childIndices: [arrayKey],
            },
          };
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        let lists = {};

        for (let arrayKey of arrayKeys) {
          if (
            dependencyValuesByKey[arrayKey].listChildren &&
            dependencyValuesByKey[arrayKey].listChildren.length === 1
          ) {
            let listChild = dependencyValuesByKey[arrayKey].listChildren[0];
            if (listChild.stateValues.type === globalDependencyValues.type) {
              lists[arrayKey] = listChild.stateValues.values;
            } else {
              // have a list child of the wrong type, attempt to convert
              lists[arrayKey] = listChild.stateValues.values.map((x) =>
                convertValueToType(x, globalDependencyValues.type),
              );
            }
          }
        }

        return {
          newValues: { lists },
        };
      },
    };

    return stateVariableDefinitions;
  }
}

function convertValueToType(value, type) {
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (type === 'number') {
    if (value instanceof me.class) {
      let num = value.evaluate_to_constant();
      if (!Number.isFinite(num)) {
        num = NaN;
      }
      return num;
    }
    return Number(value);
  } else if (type === 'math') {
    if (typeof value === 'string') {
      try {
        return me.fromAst(textToAst.convert(value));
      } catch (e) {}
    }
    return convertValueToMathExpression(value);
  } else if (type === 'boolean') {
    return Boolean(value);
  } else {
    // type is letters or text
    return String(value);
  }
}
