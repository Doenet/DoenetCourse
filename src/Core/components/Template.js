import { deepClone } from '../utils/deepFunctions';
import { processAssignNames } from '../utils/serializedStateProcessing';
import CompositeComponent from './abstract/CompositeComponent';

export default class Template extends CompositeComponent {
  static componentType = 'template';

  static treatAsComponentForRecursiveReplacements = true;
  static includeBlankStringChildren = true;

  static keepChildrenSerialized({ serializedComponent }) {
    if (serializedComponent.children === undefined) {
      return [];
    } else {
      return Object.keys(serializedComponent.children);
    }
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.rendered = {
      createComponentOfType: 'boolean',
      createStateVariable: 'rendered',
      defaultValue: false,
      public: true,
    };
    return attributes;
  }

  // don't need child logic
  // as all children will remain serialized

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.serializedChildren = {
      returnDependencies: () => ({
        serializedChildren: {
          dependencyType: 'serializedChildren',
          doNotProxy: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            serializedChildren: dependencyValues.serializedChildren,
          },
        };
      },
    };

    stateVariableDefinitions.newNamespace = {
      returnDependencies: () => ({
        newNamespace: {
          dependencyType: 'attribute',
          attributeName: 'newNamespace',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            newNamespace: dependencyValues.newNamespace,
          },
        };
      },
    };

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({}),
      definition: function () {
        return { newValues: { readyToExpandWhenResolved: true } };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({ component }) {
    if (!component.stateValues.rendered) {
      return { replacements: [] };
    } else {
      let replacements = deepClone(component.state.serializedChildren.value);

      return { replacements };
    }
  }

  get allPotentialRendererTypes() {
    return this.potentialRendererTypesFromSerializedComponents(
      this.stateValues.serializedChildren,
    );
  }
}
