import InlineComponent from './InlineComponent';

export default class Input extends InlineComponent {
  static componentType = '_input';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.collaborateGroups = {
      createComponentOfType: 'collaborateGroups',
      createStateVariable: 'collaborateGroups',
      defaultValue: undefined,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    // how many values an input returns
    stateVariableDefinitions.nValues = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { nValues: 1 } }),
    };

    stateVariableDefinitions.answerAncestor = {
      returnDependencies: () => ({
        answerAncestor: {
          dependencyType: 'ancestor',
          componentType: 'answer',
          variableNames: [
            'delegateCheckWorkToInput',
            'justSubmittedForSubmitButton',
            'creditAchievedForSubmitButton',
            'submitAllAnswersAtAncestor',
            'showCorrectness',
          ],
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { answerAncestor: dependencyValues.answerAncestor },
        };
      },
    };

    stateVariableDefinitions.includeCheckWork = {
      forRenderer: true,
      returnDependencies: () => ({
        answerAncestor: {
          dependencyType: 'stateVariable',
          variableName: 'answerAncestor',
        },
      }),
      definition: function ({ dependencyValues }) {
        let includeCheckWork = false;
        if (dependencyValues.answerAncestor) {
          includeCheckWork =
            dependencyValues.answerAncestor.stateValues
              .delegateCheckWorkToInput;
        }
        return {
          newValues: { includeCheckWork },
        };
      },
    };

    stateVariableDefinitions.creditAchievedForSubmitButton = {
      defaultValue: 0,
      public: true,
      componentType: 'number',
      forRenderer: true,
      returnDependencies: () => ({
        answerAncestor: {
          dependencyType: 'stateVariable',
          variableName: 'answerAncestor',
        },
      }),
      definition: function ({ dependencyValues }) {
        let creditAchievedForSubmitButton = 0;
        if (dependencyValues.answerAncestor) {
          creditAchievedForSubmitButton =
            dependencyValues.answerAncestor.stateValues
              .creditAchievedForSubmitButton;
        }
        return {
          newValues: { creditAchievedForSubmitButton },
        };
      },
    };
    //TODO: disabled is now in basecomponent - how to make it work with collaborateGroups
    // stateVariableDefinitions.disabled = {
    //   forRenderer: true,
    //   returnDependencies: () => ({
    //     collaborateGroups: {
    //       dependencyType: "stateVariable",
    //       variableName: "collaborateGroups"
    //     },
    //     collaboration: {
    //       dependencyType: "flag",
    //       flagName: "collaboration"
    //     }
    //   }),
    //   definition: function ({ dependencyValues }) {
    //     let disabled = false;
    //     if (dependencyValues.collaborateGroups) {
    //       disabled = !dependencyValues.collaborateGroups.matchGroup(dependencyValues.collaboration)
    //     }
    //     return { newValues: { disabled } }
    //   }
    // }

    stateVariableDefinitions.valueHasBeenValidated = {
      forRenderer: true,
      returnDependencies: () => ({
        answerAncestor: {
          dependencyType: 'stateVariable',
          variableName: 'answerAncestor',
        },
      }),
      definition: function ({ dependencyValues }) {
        let valueHasBeenValidated = false;

        if (
          dependencyValues.answerAncestor &&
          dependencyValues.answerAncestor.stateValues
            .justSubmittedForSubmitButton
        ) {
          valueHasBeenValidated = true;
        }
        return {
          newValues: { valueHasBeenValidated },
        };
      },
    };

    stateVariableDefinitions.showCorrectness = {
      forRenderer: true,
      returnDependencies: () => ({
        showCorrectnessFlag: {
          dependencyType: 'flag',
          flagName: 'showCorrectness',
        },
        answerAncestor: {
          dependencyType: 'stateVariable',
          variableName: 'answerAncestor',
        },
      }),
      definition({ dependencyValues }) {
        let showCorrectness;
        if (dependencyValues.answerAncestor) {
          showCorrectness =
            dependencyValues.answerAncestor.stateValues.showCorrectness;
        } else {
          showCorrectness = dependencyValues.showCorrectnessFlag !== false;
        }
        return { newValues: { showCorrectness } };
      },
    };

    return stateVariableDefinitions;
  }
}
