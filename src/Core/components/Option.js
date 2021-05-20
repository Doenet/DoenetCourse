import Template from './Template';
import { deepClone } from '../utils/deepFunctions';
import { processAssignNames } from '../utils/serializedStateProcessing';

export default class Option extends Template {
  static componentType = 'option';

  static includeBlankStringChildren = false;
  static assignNamesToReplacements = true;
  static originalNamesAreConsistent = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.selectForVariants = {
      createComponentOfType: 'variants',
      createStateVariable: 'selectForVariants',
      defaultValue: [],
      public: true,
    };
    attributes.selectWeight = {
      createComponentOfType: 'number',
      createStateVariable: 'selectWeight',
      defaultValue: 1,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    let componentClass = this;

    stateVariableDefinitions.serializedChildren = {
      returnDependencies: () => ({
        serializedChildren: {
          dependencyType: 'serializedChildren',
          doNotProxy: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        let serializedChildren = deepClone(
          dependencyValues.serializedChildren,
        ).filter((x) => x.componentType !== 'string');

        if (
          serializedChildren.length !==
          dependencyValues.serializedChildren.length
        ) {
          console.warn(
            `String child of ${componentClass.componentType} ignored.`,
          );
        }

        return {
          newValues: {
            serializedChildren,
          },
        };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({ component, componentInfoObjects }) {
    // console.log(`create serialized replacements for ${component.componentName}`)
    // console.log(component.stateValues.rendered);

    if (!component.stateValues.rendered) {
      return { replacements: [] };
    } else {
      let replacements = deepClone(component.state.serializedChildren.value);

      let processResult = processAssignNames({
        assignNames: component.doenetAttributes.assignNames,
        serializedComponents: replacements,
        parentName: component.componentName,
        parentCreatesNewNamespace: component.attributes.newNamespace,
        componentInfoObjects,
        originalNamesAreConsistent:
          component.attributes.newNamespace ||
          !component.doenetAttributes.assignNames,
      });

      return { replacements: processResult.serializedComponents };
    }
  }
}
