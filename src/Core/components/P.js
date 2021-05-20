import BlockComponent from './abstract/BlockComponent';

export default class P extends BlockComponent {
  static componentType = 'p';
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

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        inlineChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroInline',
          variableNames: ['text'],
          variablesOptional: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        let text = '';
        for (let child of dependencyValues.inlineChildren) {
          if (typeof child.stateValues.text === 'string') {
            text += child.stateValues.text;
          } else {
            text += ' ';
          }
        }

        return { newValues: { text } };
      },
    };

    return stateVariableDefinitions;
  }
}
