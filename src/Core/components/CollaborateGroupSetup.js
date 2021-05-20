import BaseComponent from './abstract/BaseComponent';

export default class CollaborateGroupSetup extends BaseComponent {
  static componentType = 'collaborateGroupSetup';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atMostOnePossibleNumberOfGroups',
      componentType: 'possibleNumberOfGroups',
      comparison: 'atMost',
      number: 1,
      setAsBase: true,
    });
    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.possibleNumberOfGroups = {
      returnDependencies: () => ({
        pngChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOnePossibleNumberOfGroups',
          variableNames: ['numbers'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.pngChild.length === 0) {
          return { newValues: { possibleNumberOfGroups: [1] } };
        }

        return {
          newValues: {
            possibleNumberOfGroups:
              dependencyValues.pngChild[0].stateValues.numbers,
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
