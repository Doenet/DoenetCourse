import InlineComponent from './abstract/InlineComponent';

export default class StringComponent extends InlineComponent {
  static componentType = 'string';

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['value'];
  }

  static createAttributesObject() {
    return {
      hide: {
        createComponentOfType: 'boolean',
        createStateVariable: 'hide',
        defaultValue: false,
        public: true,
      },
    };
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.value = {
      returnDependencies: () => ({}),
      defaultValue: '',
      forRenderer: true,
      set: String,
      definition: () => ({
        useEssentialOrDefaultValue: {
          value: { variablesToCheck: 'value' },
        },
      }),
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'value',
              value: String(desiredStateVariableValues.value),
            },
          ],
        };
      },
    };

    stateVariableDefinitions.text = {
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition({ dependencyValues }) {
        return { newValues: { text: dependencyValues.value } };
      },
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setDependency: 'value',
              desiredValue: desiredStateVariableValues.text,
            },
          ],
        };
      },
    };

    return stateVariableDefinitions;
  }
}
