import Option from './Option';
import { deepClone } from '../utils/deepFunctions';

export default class Case extends Option {
  static componentType = 'case';

  static get stateVariablesShadowedForReference() {
    return ['conditionSatisfied'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.condition = {
      createComponentOfType: 'boolean',
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.conditionSatisfied = {
      public: true,
      componentType: 'boolean',
      returnDependencies: () => ({
        condition: {
          dependencyType: 'attributeComponent',
          attributeName: 'condition',
          variableNames: ['value'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let conditionSatisfied;
        if (dependencyValues.condition === null) {
          conditionSatisfied = true;
        } else {
          conditionSatisfied = dependencyValues.condition.stateValues.value;
        }

        return { newValues: { conditionSatisfied } };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({ component, componentInfoObjects }) {
    if (!component.stateValues.conditionSatisfied) {
      return { replacements: [] };
    }

    return super.createSerializedReplacements({
      component,
      componentInfoObjects,
    });
  }
}
