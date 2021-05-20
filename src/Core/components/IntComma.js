import Text from './Text';
import { renameStateVariable } from '../utils/stateVariables';

// convert number to number separated by commas, a la django humanize's intcomma

export default class IntComma extends Text {
  static componentType = 'intcomma';
  static rendererType = 'text';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.originalValue = stateVariableDefinitions.value;

    // rename value to originalValue
    renameStateVariable({
      stateVariableDefinitions,
      oldName: 'value',
      newName: 'originalValue',
    });

    stateVariableDefinitions.value = {
      public: true,
      componentType: this.componentType,
      returnDependencies: () => ({
        originalValue: {
          dependencyType: 'stateVariable',
          variableName: 'originalValue',
        },
      }),
      definition: function ({ dependencyValues }) {
        let value = dependencyValues.originalValue;

        let startAtLeastFourNumRegex = /^(-?\d+)(\d{3})/;
        let matchObj = value.match(startAtLeastFourNumRegex);
        while (matchObj !== null) {
          value = value.replace(startAtLeastFourNumRegex, `$1,$2`);
          matchObj = value.match(startAtLeastFourNumRegex);
        }

        return { newValues: { value } };
      },
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { text: dependencyValues.value },
      }),
    };

    return stateVariableDefinitions;
  }
}
