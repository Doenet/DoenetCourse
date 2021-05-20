import BlockComponent from './abstract/BlockComponent';

export default class Graph extends BlockComponent {
  static componentType = 'graph';
  static renderChildren = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.xmin = {
      createComponentOfType: 'number',
      createStateVariable: 'xmin',
      defaultValue: -10,
      public: true,
      forRenderer: true,
    };
    attributes.xmax = {
      createComponentOfType: 'number',
      createStateVariable: 'xmax',
      defaultValue: 10,
      public: true,
      forRenderer: true,
    };
    attributes.ymin = {
      createComponentOfType: 'number',
      createStateVariable: 'ymin',
      defaultValue: -10,
      public: true,
      forRenderer: true,
    };
    attributes.ymax = {
      createComponentOfType: 'number',
      createStateVariable: 'ymax',
      defaultValue: 10,
      public: true,
      forRenderer: true,
    };
    attributes.width = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'width',
      defaultValue: { size: 300, isAbsolute: true },
      public: true,
      forRenderer: true,
    };
    attributes.height = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'height',
      defaultValue: { size: 300, isAbsolute: true },
      public: true,
      forRenderer: true,
    };
    attributes.displayXAxis = {
      createComponentOfType: 'boolean',
      createStateVariable: 'displayXAxis',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };
    attributes.displayYAxis = {
      createComponentOfType: 'boolean',
      createStateVariable: 'displayYAxis',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };
    attributes.xlabel = {
      createComponentOfType: 'text',
      createStateVariable: 'xlabel',
      defaultValue: '',
      public: true,
      forRenderer: true,
    };
    attributes.ylabel = {
      createComponentOfType: 'text',
      createStateVariable: 'ylabel',
      defaultValue: '',
      public: true,
      forRenderer: true,
    };
    attributes.showNavigation = {
      createComponentOfType: 'boolean',
      createStateVariable: 'showNavigation',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let addCurve = function ({ matchedChildren }) {
      // add <curve> around strings, as long as they don't have points
      if (matchedChildren[0].state.value.includes(',')) {
        return { success: false };
      }
      return {
        success: true,
        newChildren: [{ componentType: 'curve', children: matchedChildren }],
      };
    };

    sugarInstructions.push({
      childrenRegex: 's',
      replacementFunction: addCurve,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroGraphical',
      componentType: '_graphical',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.graphicalDescendants = {
      forRenderer: true,
      returnDependencies: () => ({
        graphicalDescendants: {
          dependencyType: 'descendant',
          componentTypes: ['_graphical'],
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            graphicalDescendants: dependencyValues.graphicalDescendants,
          },
        };
      },
    };

    return stateVariableDefinitions;
  }

  changeAxisLimits({ xmin, xmax, ymin, ymax }) {
    let updateInstructions = [];

    if (xmin !== undefined) {
      updateInstructions.push({
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'xmin',
        value: xmin,
      });
    }
    if (xmax !== undefined) {
      updateInstructions.push({
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'xmax',
        value: xmax,
      });
    }
    if (ymin !== undefined) {
      updateInstructions.push({
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'ymin',
        value: ymin,
      });
    }
    if (ymax !== undefined) {
      updateInstructions.push({
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'ymax',
        value: ymax,
      });
    }

    this.coreFunctions.requestUpdate({
      updateInstructions,
      event: {
        verb: 'interacted',
        object: {
          componentName: this.componentName,
          componentType: this.componentType,
        },
        result: {
          xmin,
          xmax,
          ymin,
          ymax,
        },
      },
    });
  }

  actions = {
    changeAxisLimits: this.changeAxisLimits.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
  };
}
