import { isValidVariable } from '../utils/math';
import MathComponent from './Math';

export default class Variable extends MathComponent {
  static componentType = 'variable';
  static rendererType = 'math';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.validVariable = {
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition: function ({ dependencyValues }) {
        let validVariable = isValidVariable(dependencyValues.value);

        if (!validVariable) {
          console.warn('Invalid value of a ' + this.componentType);
        }

        return { newValues: { validVariable } };
      },
    };

    return stateVariableDefinitions;
  }
}
