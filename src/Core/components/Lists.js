import BlockComponent from './abstract/BlockComponent';
import BaseComponent from './abstract/BaseComponent';

export class Ol extends BlockComponent {
  static componentType = 'ol';
  static rendererType = 'list';
  static renderChildren = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.label = {
      createComponentOfType: 'text',
      createStateVariable: 'label',
      defaultValue: undefined,
      public: true,
      forRenderer: true,
    };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroLis',
      componentType: 'li',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numbered = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { numbered: true } }),
    };

    return stateVariableDefinitions;
  }
}

export class Ul extends Ol {
  static componentType = 'ul';
  static rendererType = 'list';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.numbered = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { numbered: false } }),
    };

    return stateVariableDefinitions;
  }
}

export class Li extends BaseComponent {
  static componentType = 'li';
  static rendererType = 'list';
  static renderChildren = true;

  static includeBlankStringChildren = true;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

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

    childLogic.newOperator({
      name: 'inlineOrBlock',
      operator: 'or',
      propositions: [atLeastZeroInline, atLeastZeroBlock],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.item = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { item: true } }),
    };

    return stateVariableDefinitions;
  }
}
