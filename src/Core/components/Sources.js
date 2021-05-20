import BaseComponent from './abstract/BaseComponent';

export default class Sources extends BaseComponent {
  static componentType = 'sources';
  static rendererType = 'container';
  static renderChildren = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.alias = {
      createPrimitiveOfType: 'string',
      validationFunction: function (value) {
        if (!/[a-zA-Z_]/.test(value.substring(0, 1))) {
          throw Error('All aliases must begin with a letter or an underscore');
        }
        if (!/^[a-zA-Z0-9_\-]+$/.test(value)) {
          throw Error(
            'Aliases can contain only letters, numbers, hyphens, and underscores',
          );
        }
        return value;
      },
    };

    attributes.indexAlias = {
      createPrimitiveOfType: 'string',
      validationFunction: function (value) {
        if (!/[a-zA-Z_]/.test(value.substring(0, 1))) {
          throw Error(
            'All index aliases must begin with a letter or an underscore',
          );
        }
        if (!/^[a-zA-Z0-9_\-]+$/.test(value)) {
          throw Error(
            'Index aliases can contain only letters, numbers, hyphens, and underscores',
          );
        }
        return value;
      },
    };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroChildren',
      componentType: '_base',
      excludeComponentTypes: ['_composite'],
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.alias = {
      returnDependencies: () => ({
        alias: {
          dependencyType: 'attribute',
          attributeName: 'alias',
        },
      }),
      definition({ dependencyValues }) {
        return { newValues: { alias: dependencyValues.alias } };
      },
    };

    stateVariableDefinitions.indexAlias = {
      returnDependencies: () => ({
        indexAlias: {
          dependencyType: 'attribute',
          attributeName: 'indexAlias',
        },
      }),
      definition({ dependencyValues }) {
        return { newValues: { indexAlias: dependencyValues.indexAlias } };
      },
    };

    stateVariableDefinitions.numberOfChildren = {
      additionalStateVariablesDefined: [
        'childComponentNames',
        'childIdentities',
      ],
      returnDependencies: () => ({
        children: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroChildren',
        },
      }),
      definition: function ({ dependencyValues }) {
        let numberOfChildren = dependencyValues.children.length;
        let childComponentNames = dependencyValues.children.map(
          (x) => x.componentName,
        );
        return {
          newValues: {
            numberOfChildren,
            childComponentNames,
            childIdentities: dependencyValues.children,
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
