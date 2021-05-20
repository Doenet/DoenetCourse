import BlockComponent from './abstract/BlockComponent';

export default class Hint extends BlockComponent {
  static componentType = 'hint';
  static renderChildren = true;

  static includeBlankStringChildren = true;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atMostOneTitle = childLogic.newLeaf({
      name: 'atMostOneTitle',
      componentType: 'title',
      comparison: 'atMost',
      number: 1,
    });

    let atLeastZeroInline = childLogic.newLeaf({
      name: 'atLeastZeroInline',
      componentType: '_inline',
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroBlock = childLogic.newLeaf({
      name: 'atLeastZeroBlock',
      componentType: '_block',
      comparison: 'atLeast',
      number: 0,
    });

    let inlineOrBlock = childLogic.newOperator({
      name: 'inlineOrBlock',
      operator: 'or',
      propositions: [atLeastZeroInline, atLeastZeroBlock],
    });

    childLogic.newOperator({
      name: 'titleAndContent',
      operator: 'and',
      propositions: [atMostOneTitle, inlineOrBlock],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.showHints = {
      forRenderer: true,
      returnDependencies: () => ({
        hide: {
          dependencyType: 'stateVariable',
          variableName: 'hide',
        },
        showHintsFlag: {
          dependencyType: 'flag',
          flagName: 'showHints',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            showHints: dependencyValues.showHintsFlag && !dependencyValues.hide,
          },
        };
      },
    };

    stateVariableDefinitions.open = {
      public: true,
      componentType: 'boolean',
      forRenderer: true,
      defaultValue: false,
      returnDependencies: () => ({}),
      definition() {
        return {
          useEssentialOrDefaultValue: {
            open: {
              variablesToCheck: ['open'],
            },
          },
        };
      },
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'open',
              value: desiredStateVariableValues.open,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.titleDefinedByChildren = {
      forRenderer: true,
      returnDependencies: () => ({
        titleChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneTitle',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            titleDefinedByChildren: dependencyValues.titleChild.length === 1,
          },
        };
      },
    };

    stateVariableDefinitions.title = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        titleChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneTitle',
          variableNames: ['text'],
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.titleChild.length === 0) {
          return { newValues: { title: 'Hint' } };
        } else {
          return {
            newValues: {
              title: dependencyValues.titleChild[0].stateValues.text,
            },
          };
        }
      },
    };

    return stateVariableDefinitions;
  }

  revealHint() {
    this.coreFunctions.requestUpdate({
      updateInstructions: [
        {
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'open',
          value: true,
        },
      ],
      event: {
        verb: 'viewed',
        object: {
          componentName: this.componentName,
          componentType: this.componentType,
        },
      },
    });
  }

  closeHint() {
    this.coreFunctions.requestUpdate({
      updateInstructions: [
        {
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'open',
          value: false,
        },
      ],
      event: {
        verb: 'closed',
        object: {
          componentName: this.componentName,
          componentType: this.componentType,
        },
      },
    });
  }

  actions = {
    revealHint: this.revealHint.bind(this),
    closeHint: this.closeHint.bind(this),
  };
}
