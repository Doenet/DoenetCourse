import CompositeComponent from './abstract/CompositeComponent';
import { postProcessCopy } from '../utils/copy';

export default class ConditionalContent extends CompositeComponent {
  static componentType = 'conditionalContent';

  static get stateVariablesShadowedForReference() {
    return ['hide'];
  }

  static stateVariableToEvaluateAfterReplacements =
    'needsReplacementsUpdatedWhenStale';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    delete attributes.hide;

    attributes.condition = {
      createComponentOfType: 'boolean',
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroAnything',
      componentType: '_base',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });
    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.hide = {
      returnDependencies: () => ({
        conditionAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'condition',
          variableNames: ['value'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let hide;
        if (dependencyValues.conditionAttr === null) {
          hide = true;
        } else {
          hide = !dependencyValues.conditionAttr.stateValues.value;
        }

        return { newValues: { hide } };
      },
    };

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        hide: {
          dependencyType: 'stateVariable',
          variableName: 'hide',
        },
        anyChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroAnything',
        },
        needsReplacementsUpdatedWhenStale: {
          dependencyType: 'stateVariable',
          variableName: 'needsReplacementsUpdatedWhenStale',
        },
      }),
      definition() {
        return { newValues: { readyToExpandWhenResolved: true } };
      },
    };

    stateVariableDefinitions.conditionName = {
      returnDependencies: () => ({
        conditionAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'condition',
        },
      }),
      definition: function ({ dependencyValues }) {
        let conditionName;
        if (dependencyValues.conditionAttr !== null) {
          conditionName = dependencyValues.conditionAttr.componentName;
        }

        return { newValues: { conditionName } };
      },
    };

    stateVariableDefinitions.needsReplacementsUpdatedWhenStale = {
      returnDependencies: () => ({
        hide: {
          dependencyType: 'stateVariable',
          variableName: 'hide',
        },
      }),
      // the whole point of this state variable is to return updateReplacements
      // on mark stale
      markStale: () => ({ updateReplacements: true }),
      definition: () => ({
        newValues: { needsReplacementsUpdatedWhenStale: true },
      }),
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({ component, workspace }) {
    workspace.previouslyHidden = component.stateValues.hide;

    if (component.stateValues.hide) {
      return { replacements: [] };
    }

    let serializedChildrenCopy = component.activeChildren
      .filter((x) => x.componentName !== component.stateValues.conditionName)
      .map((x) => x.serialize({ forCopy: true }));

    if (!workspace.uniqueIdentifiersUsed) {
      workspace.uniqueIdentifiersUsed = [];
    }

    return {
      replacements: postProcessCopy({
        serializedComponents: serializedChildrenCopy,
        componentName: component.componentName,
        uniqueIdentifiersUsed: workspace.uniqueIdentifiersUsed,
      }),
    };
  }

  static calculateReplacementChanges({
    component,
    componentChanges,
    components,
    workspace,
  }) {
    if (component.stateValues.hide) {
      if (workspace.previouslyHidden) {
        return [];
      } else {
        workspace.previouslyHidden = true;

        let replacementsToWithhold = component.replacements.length;
        let replacementInstruction = {
          changeType: 'changeReplacementsToWithhold',
          replacementsToWithhold,
        };

        return [replacementInstruction];
      }
    }

    if (!workspace.previouslyHidden) {
      return [];
    }

    workspace.previouslyHidden = false;

    let childrenToCopy = component.activeChildren.filter(
      (x) => x.componentName !== component.stateValues.conditionName,
    );

    if (component.replacements.length === childrenToCopy.length) {
      // just stop withholding replacements
      let replacementInstruction = {
        changeType: 'changeReplacementsToWithhold',
        replacementsToWithhold: 0,
      };

      return [replacementInstruction];
    }

    // create new replacements

    let serializedChildrenCopy = childrenToCopy.map((x) =>
      x.serialize({ forCopy: true }),
    );

    if (!workspace.uniqueIdentifiersUsed) {
      workspace.uniqueIdentifiersUsed = [];
    }

    let serializedReplacements = postProcessCopy({
      serializedComponents: serializedChildrenCopy,
      componentName: component.componentName,
      uniqueIdentifiersUsed: workspace.uniqueIdentifiersUsed,
    });

    let replacementInstruction = {
      changeType: 'add',
      changeTopLevelReplacements: true,
      firstReplacementInd: 0,
      numberReplacementsToReplace: component.replacements.length,
      replacementsToWithhold: 0,
      serializedReplacements: serializedReplacements,
    };

    return [replacementInstruction];
  }

  get allPotentialRendererTypes() {
    let allPotentialRendererTypes = [];

    for (let childName in this.allChildren) {
      let child = this.allChildren[childName].component;
      for (let rendererType of child.allPotentialRendererTypes) {
        if (!allPotentialRendererTypes.includes(rendererType)) {
          allPotentialRendererTypes.push(rendererType);
        }
      }
    }

    return allPotentialRendererTypes;
  }
}
