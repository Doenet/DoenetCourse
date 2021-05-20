import InlineComponent from './abstract/InlineComponent';

export default class Seeds extends InlineComponent {
  static componentType = 'seeds';
  static rendererType = undefined;

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakStringsIntoSeedsBySpaces = function ({ matchedChildren }) {
      // break any string by white space and wrap pieces with seed

      let newChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => ({
                componentType: 'seed',
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
      replacementFunction: breakStringsIntoSeedsBySpaces,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroSeeds',
      componentType: 'seed',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nSeeds = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        seedChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroSeeds',
        },
      }),
      definition: function ({ dependencyValues }) {
        return { newValues: { nSeeds: dependencyValues.seedChildren.length } };
      },
    };

    stateVariableDefinitions.seeds = {
      public: true,
      componentType: 'seed',
      isArray: true,
      entryPrefixes: ['seed'],
      returnArraySizeDependencies: () => ({
        nSeeds: {
          dependencyType: 'stateVariable',
          variableName: 'nSeeds',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nSeeds];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            seedChild: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroSeeds',
              variableNames: ['value'],
              childIndices: [arrayKey],
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey: function ({ dependencyValuesByKey, arrayKeys }) {
        let seeds = {};
        for (let arrayKey of arrayKeys) {
          if (dependencyValuesByKey[arrayKey].seedChild.length === 1) {
            seeds[arrayKey] =
              dependencyValuesByKey[arrayKey].seedChild[0].stateValues.value;
          }
        }
        return { newValues: { seeds } };
      },
    };

    return stateVariableDefinitions;
  }
}
