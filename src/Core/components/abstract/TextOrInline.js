import InlineComponent from './InlineComponent';

export default class TextOrInline extends InlineComponent {
  static componentType = '_textOrInline';
  static renderChildren = true;

  static includeBlankStringChildren = true;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroInline',
      componentType: '_inline',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.value = {
      public: true,
      componentType: this.componentType,
      returnDependencies: () => ({
        inlineChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroInline',
          variableNames: ['text'],
          variablesOptional: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        let value = '';
        for (let comp of dependencyValues.inlineChildren) {
          if (typeof comp.stateValues.text === 'string') {
            value += comp.stateValues.text;
          }
        }
        return { newValues: { value } };
      },
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
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
