import BooleanComponent from '../Boolean';

export default class BooleanBaseOperatorOfMath extends BooleanComponent {
  static componentType = '_booleanOperatorOfMath';
  static rendererType = 'boolean';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.deleteAllLogic();

    childLogic.newLeaf({
      name: 'atLeastOneMath',
      componentType: 'math',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    delete stateVariableDefinitions.parsedExpression;
    delete stateVariableDefinitions.mathChildrenByCode;

    let constructor = this;

    stateVariableDefinitions.value = {
      public: true,
      componentType: 'boolean',
      forRenderer: true,
      returnDependencies: () => ({
        mathChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneMath',
          variableNames: ['value'],
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            value: constructor.applyBooleanOperator(
              dependencyValues.mathChildren.map((x) => x.stateValues.value),
            ),
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
