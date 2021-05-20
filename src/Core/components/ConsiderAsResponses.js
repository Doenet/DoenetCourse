import BlockComponent from './abstract/BlockComponent';

export default class ConsiderAsResponses extends BlockComponent {
  static componentType = 'considerAsResponses';
  static rendererType = undefined;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'anything',
      componentType: '_base',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.childrenWithNValues = {
      returnDependencies: () => ({
        children: {
          dependencyType: 'child',
          childLogicName: 'anything',
          variableNames: ['nValues'],
          variablesOptional: true,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { childrenWithNValues: dependencyValues.children },
      }),
    };

    stateVariableDefinitions.childrenAsResponses = {
      returnDependencies: () => ({
        children: {
          dependencyType: 'child',
          childLogicName: 'anything',
          variableNames: ['value', 'values', 'componentType'],
          variablesOptional: true,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { childrenAsResponses: dependencyValues.children },
      }),
    };

    return stateVariableDefinitions;
  }
}
