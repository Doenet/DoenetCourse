import BaseComponent from './abstract/BaseComponent';

export default class Variants extends BaseComponent {
  static componentType = 'variants';
  static rendererType = undefined;

  static stateVariableForAttributeValue = 'variants';

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakStringsIntoVariantsBySpaces = function ({ matchedChildren }) {
      // break any string by white space and wrap pieces with variant

      let newChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => ({
                componentType: 'variant',
                state: { value: s },
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
      replacementFunction: breakStringsIntoVariantsBySpaces,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroVariants',
      componentType: 'variant',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nVariants = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        variantChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroVariants',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { nVariants: dependencyValues.variantChildren.length },
        };
      },
    };

    stateVariableDefinitions.variants = {
      public: true,
      componentType: 'variant',
      isArray: true,
      entryPrefixes: ['variant'],
      returnArraySizeDependencies: () => ({
        nVariants: {
          dependencyType: 'stateVariable',
          variableName: 'nVariants',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nVariants];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            variantChild: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroVariants',
              variableNames: ['value'],
              childIndices: [arrayKey],
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey: function ({ dependencyValuesByKey, arrayKeys }) {
        let variants = {};
        for (let arrayKey of arrayKeys) {
          if (dependencyValuesByKey[arrayKey].variantChild.length === 1) {
            variants[arrayKey] =
              dependencyValuesByKey[
                arrayKey
              ].variantChild[0].stateValues.value.toLowerCase();
          }
        }
        return { newValues: { variants } };
      },
    };

    return stateVariableDefinitions;
  }
}
