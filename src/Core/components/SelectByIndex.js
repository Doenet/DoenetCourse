import CompositeComponent from './abstract/CompositeComponent';
import { deepClone } from '../utils/deepFunctions';
import { processAssignNames } from '../utils/serializedStateProcessing';

export default class SelectByIndex extends CompositeComponent {
  static componentType = 'selectByIndex';

  // static assignNewNamespaceToAllChildrenExcept = Object.keys(this.createAttributesObject({})).map(x => x.toLowerCase());
  static assignNamesToReplacements = true;

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['selectedIndices'];
  }

  static stateVariableToEvaluateAfterReplacements =
    'needsReplacementsUpdatedWhenStale';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.selectIndices = {
      createComponentOfType: 'numberList',
      createStateVariable: 'selectIndices',
      defaultValue: [],
      public: true,
    };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastOneOption',
      componentType: 'option',
      comparison: 'atLeast',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nOptions = {
      additionalStateVariablesDefined: ['optionChildren'],
      returnDependencies: () => ({
        optionChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneOption',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            optionChildren: dependencyValues.optionChildren,
            nOptions: dependencyValues.optionChildren.length,
          },
        };
      },
    };

    stateVariableDefinitions.selectedIndices = {
      returnDependencies: () => ({
        nOptions: {
          dependencyType: 'stateVariable',
          variableName: 'nOptions',
        },
        selectIndices: {
          dependencyType: 'stateVariable',
          variableName: 'selectIndices',
        },
      }),
      definition: function ({ dependencyValues }) {
        // console.log(`definition of selectedIndices`)
        // console.log(dependencyValues);

        if (dependencyValues.nOptions === 0) {
          return { newValues: { selectedIndices: [] } };
        }

        let indicesToSelect = dependencyValues.selectIndices;

        let selectedIndices = indicesToSelect
          .filter(
            (ind) =>
              Number.isInteger(ind) &&
              ind >= 1 &&
              ind <= dependencyValues.nOptions,
          )
          .map((x) => x - 1);

        return { newValues: { selectedIndices } };
      },
    };

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        selectedIndices: {
          dependencyType: 'stateVariable',
          variableName: 'selectedIndices',
        },
      }),
      definition() {
        return {
          newValues: { readyToExpandWhenResolved: true },
        };
      },
    };

    stateVariableDefinitions.needsReplacementsUpdatedWhenStale = {
      returnDependencies: () => ({
        selectedIndices: {
          dependencyType: 'stateVariable',
          variableName: 'selectedIndices',
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

  static createSerializedReplacements({
    component,
    components,
    workspace,
    componentInfoObjects,
  }) {
    let replacements = this.getReplacements(
      component,
      components,
      componentInfoObjects,
    );

    workspace.previousSelectedIndices = [
      ...component.stateValues.selectedIndices,
    ];

    return { replacements };
  }

  static getReplacements(component, components, componentInfoObjects) {
    let replacements = [];

    for (let selectedIndex of component.stateValues.selectedIndices) {
      let selectedChildName =
        component.stateValues.optionChildren[selectedIndex].componentName;

      // use state, not stateValues, as read only proxy messes up internal
      // links between descendant variant components and the components themselves

      let serializedGrandchildren = deepClone(
        components[selectedChildName].state.serializedChildren.value,
      );
      let serializedChild = {
        componentType: 'option',
        state: { rendered: true },
        doenetAttributes: Object.assign(
          {},
          components[selectedChildName].doenetAttributes,
        ),
        children: serializedGrandchildren,
        originalName: selectedChildName,
      };

      if (component.stateValues.hide) {
        // if select is hidden, then make each of its replacements hidden
        if (!serializedChild.state) {
          serializedChild.state = {};
        }

        serializedChild.state.hide = true;

        // // if assigning names to grandchild, then hide those as well
        // // so that refs of those will be hidden, for consistency
        // if (Array.isArray(name)) {
        //   if (serializedChild.children) {
        //     for (let grandchild of serializedChild.children) {
        //       if (!grandchild.state) {
        //         grandchild.state = {};
        //       }
        //       grandchild.state.hide = true;
        //     }
        //   }
        // }
      }

      replacements.push(serializedChild);
    }

    let processResult = processAssignNames({
      assignNames: component.doenetAttributes.assignNames,
      serializedComponents: replacements,
      parentName: component.componentName,
      parentCreatesNewNamespace: component.attributes.newNamespace,
      componentInfoObjects,
    });

    // console.log(`replacements for selectByIndex`)
    // console.log(deepClone(processResult.serializedComponents));

    return processResult.serializedComponents;
  }

  static calculateReplacementChanges({
    component,
    componentChanges,
    components,
    workspace,
    componentInfoObjects,
  }) {
    // console.log(`calculate replacement changes for selectByIndex`)
    // console.log([...workspace.previousSelectedIndices]);
    // console.log([...component.stateValues.selectedIndices])

    if (
      workspace.previousSelectedIndices.length ===
        component.stateValues.selectedIndices.length &&
      component.stateValues.selectedIndices.every(
        (v, i) => v === workspace.previousSelectedIndices[i],
      )
    ) {
      return [];
    }

    // delete previous replacements and create new ones
    // TODO: could we find a way to withhold old ones?
    // Either change order of replacements or allow to withhold latter replacements

    let replacementChanges = [];

    let replacements = this.getReplacements(
      component,
      components,
      componentInfoObjects,
    );

    let replacementInstruction = {
      changeType: 'add',
      changeTopLevelReplacements: true,
      firstReplacementInd: 0,
      numberReplacementsToReplace: component.replacements.length,
      serializedReplacements: replacements,
      replacementsToWithhold: 0,
    };

    replacementChanges.push(replacementInstruction);

    workspace.previousSelectedIndices = [
      ...component.stateValues.selectedIndices,
    ];

    // console.log(`replacementChanges for selectByIndex ${component.componentName}`);
    // console.log(replacementChanges);

    return replacementChanges;
  }
}
