import BooleanComponent from '../Boolean';
import { renameStateVariable } from '../../utils/stateVariables';

export default class BooleanOperatorOneInput extends BooleanComponent {
  static componentType = '_booleanOperatorOneInput';
  static rendererType = 'boolean';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    let constructor = this;

    // rename value to valuePreOperator
    renameStateVariable({
      stateVariableDefinitions,
      oldName: 'value',
      newName: 'valuePreOperator',
    });

    // create new version of value that applies operator
    stateVariableDefinitions.value = {
      public: true,
      componentType: 'boolean',
      forRenderer: true,
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'valuePreOperator',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            value: constructor.applyBooleanOperator(dependencyValues.value),
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
