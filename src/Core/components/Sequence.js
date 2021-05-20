import CompositeComponent from './abstract/CompositeComponent';
import { processAssignNames } from '../utils/serializedStateProcessing';
import { convertAttributesForComponentType } from '../utils/copy';
import {
  returnSequenceValues,
  returnSequenceValueForIndex,
  returnStandardSequenceAttributes,
  returnStandardSequenceStateVariableDefinitions,
  returnStandardSequenceStateVariablesShadowedForReference,
} from '../utils/sequence';

export default class Sequence extends CompositeComponent {
  static componentType = 'sequence';

  static assignNamesToReplacements = true;

  // don't actually need to shadow these, as replacements for shadows
  // ignore state variables
  // but, shadow them so that state variables are consistent
  // since attributeComponents aren't copied
  static get stateVariablesShadowedForReference() {
    return returnStandardSequenceStateVariablesShadowedForReference();
  }

  static stateVariableToEvaluateAfterReplacements = 'readyToExpandWhenResolved';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.fixed = {
      leaveRaw: true,
    };

    let sequenceAttributes = returnStandardSequenceAttributes();
    Object.assign(attributes, sequenceAttributes);

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    let sequenceDefs = returnStandardSequenceStateVariableDefinitions();
    Object.assign(stateVariableDefinitions, sequenceDefs);

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        from: {
          dependencyType: 'stateVariable',
          variableName: 'from',
        },
        length: {
          dependencyType: 'stateVariable',
          variableName: 'length',
        },
        step: {
          dependencyType: 'stateVariable',
          variableName: 'step',
        },
        type: {
          dependencyType: 'stateVariable',
          variableName: 'type',
        },
        exclude: {
          dependencyType: 'stateVariable',
          variableName: 'exclude',
        },
      }),
      // when this state variable is marked stale
      // it indicates we should update replacement
      // For this to work, must get value in replacement functions
      // so that the variable is marked fresh
      markStale: () => ({ updateReplacements: true }),
      definition: function () {
        // even with invalid sequence, still ready to expand
        // (it will just expand with zero replacements)
        return { newValues: { readyToExpandWhenResolved: true } };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({
    component,
    workspace,
    componentInfoObjects,
  }) {
    // console.log(`create serialized replacements for ${component.componentName}`)

    if (!component.stateValues.validSequence) {
      workspace.lastReplacementParameters = {
        from: null,
        length: null,
        step: null,
        type: null,
        exclude: null,
      };
      return { replacements: [] };
    }

    workspace.lastReplacementParameters = {
      from: component.stateValues.from,
      length: component.stateValues.length,
      step: component.stateValues.step,
      type: component.stateValues.type,
      exclude: component.stateValues.exclude,
    };

    let replacements = [];

    let sequenceValues = returnSequenceValues({
      from: component.stateValues.from,
      step: component.stateValues.step,
      length: component.stateValues.length,
      exclude: component.stateValues.exclude,
      type: component.stateValues.type,
      lowercase: component.stateValues.lowercase,
    });

    let componentType = component.stateValues.type;
    if (component.stateValues.type === 'letters') {
      componentType = 'text';
    }

    for (let componentValue of sequenceValues) {
      // allow one to override the fixed (default true) attribute
      // by specifying it on the sequence
      let attributesFromComposite = {};

      if ('fixed' in component.attributes) {
        attributesFromComposite = convertAttributesForComponentType({
          attributes: { fixed: component.attributes.fixed },
          componentType,
          componentInfoObjects,
          compositeAttributesObj: {},
          compositeCreatesNewNamespace: component.attributes.newNamespace,
        });
      }

      let serializedComponent = {
        componentType,
        attributes: attributesFromComposite,
        state: { value: componentValue, fixed: true },
      };
      replacements.push(serializedComponent);
    }

    // console.log(`replacements for ${component.componentName}`)
    // console.log(replacements)

    let processResult = processAssignNames({
      assignNames: component.doenetAttributes.assignNames,
      serializedComponents: replacements,
      parentName: component.componentName,
      parentCreatesNewNamespace: component.attributes.newNamespace,
      componentInfoObjects,
    });

    return { replacements: processResult.serializedComponents };
  }

  static calculateReplacementChanges({
    component,
    workspace,
    componentInfoObjects,
  }) {
    // console.log(`calculate replacement changes for ${component.componentName}`);

    let lrp = workspace.lastReplacementParameters;

    let replacementChanges = [];

    // if invalid, withhold any previous replacementsreplacements
    if (!component.stateValues.validSequence) {
      if (component.replacements.length > 0) {
        let replacementsToWithhold = component.replacements.length;
        let replacementInstruction = {
          changeType: 'changeReplacementsToWithhold',
          replacementsToWithhold,
        };
        replacementChanges.push(replacementInstruction);
      }

      // leave all previous replacement parameters as they were before
      // except make length zero.
      // That way, if later restore to previous parameter set,
      // we can restore the old replacements
      lrp.length = 0;

      return replacementChanges;
    }

    // check if changed type
    // or have excluded elements
    // TODO: don't completely recreate if have excluded elements
    if (
      lrp.type !== component.stateValues.type ||
      lrp.exclude.length > 0 ||
      component.stateValues.exclude.length > 0
    ) {
      // calculate new serialized replacements
      let newSerializedReplacements = this.createSerializedReplacements({
        component,
        workspace,
        componentInfoObjects,
      }).replacements;

      let replacementInstruction = {
        changeType: 'add',
        changeTopLevelReplacements: true,
        firstReplacementInd: 0,
        numberReplacementsToReplace: component.replacements.length,
        serializedReplacements: newSerializedReplacements,
        replacementsToWithhold: 0,
      };

      replacementChanges.push(replacementInstruction);
    } else {
      let modifyExistingValues = false;
      if (component.stateValues.type === 'math') {
        if (
          !(
            component.stateValues.from.equals(lrp.from) &&
            component.stateValues.step.equals(lrp.step)
          )
        ) {
          modifyExistingValues = true;
        }
      } else {
        if (
          component.stateValues.from !== lrp.from ||
          component.stateValues.step !== lrp.step
        ) {
          modifyExistingValues = true;
        }
      }

      let prevlength = lrp.length;
      let numReplacementsToAdd = 0;
      let numToModify = 0;
      let firstToModify = prevlength;
      let newReplacementsToWithhold;

      // if have fewer replacements than before
      // mark old replacements as hidden
      if (component.stateValues.length < prevlength) {
        newReplacementsToWithhold =
          component.replacements.length - component.stateValues.length;

        let replacementInstruction = {
          changeType: 'changeReplacementsToWithhold',
          replacementsToWithhold: newReplacementsToWithhold,
        };
        replacementChanges.push(replacementInstruction);
      } else if (component.stateValues.length > prevlength) {
        numReplacementsToAdd = component.stateValues.length - prevlength;

        if (component.replacementsToWithhold > 0) {
          if (component.replacementsToWithhold >= numReplacementsToAdd) {
            newReplacementsToWithhold =
              component.replacementsToWithhold - numReplacementsToAdd;
            numToModify += numReplacementsToAdd;
            prevlength += numReplacementsToAdd;
            numReplacementsToAdd = 0;

            let replacementInstruction = {
              changeType: 'changeReplacementsToWithhold',
              replacementsToWithhold: newReplacementsToWithhold,
            };
            replacementChanges.push(replacementInstruction);
          } else {
            numReplacementsToAdd -= component.replacementsToWithhold;
            numToModify += component.replacementsToWithhold;
            prevlength += component.replacementsToWithhold;
            newReplacementsToWithhold = 0;
            // don't need to send changedReplacementsToWithold instructions
            // since will send add instructions,
            // which will also recalculate replacements in parent
          }
        }
      }

      if (modifyExistingValues === true) {
        numToModify = prevlength;
        firstToModify = 0;
      }

      if (numToModify > 0) {
        // need to modify values of the first prevlength components

        for (
          let ind = firstToModify;
          ind < firstToModify + numToModify;
          ind++
        ) {
          let componentValue = returnSequenceValueForIndex({
            index: ind,
            from: component.stateValues.from,
            step: component.stateValues.step,
            exclude: [],
            type: component.stateValues.type,
            lowercase: component.stateValues.lowercase,
          });

          let replacementInstruction = {
            changeType: 'updateStateVariables',
            component: component.replacements[ind],
            stateChanges: { value: componentValue },
          };
          replacementChanges.push(replacementInstruction);
        }
      }

      if (numReplacementsToAdd > 0) {
        // Need to add more replacement components

        let newSerializedReplacements = [];

        for (let ind = prevlength; ind < component.stateValues.length; ind++) {
          let componentValue = returnSequenceValueForIndex({
            index: ind,
            from: component.stateValues.from,
            step: component.stateValues.step,
            exclude: [],
            type: component.stateValues.type,
            lowercase: component.stateValues.lowercase,
          });

          let componentType = component.stateValues.type;
          if (component.stateValues.type === 'letters') {
            componentType = 'text';
          }

          // allow one to override the fixed (default true) attribute
          // by specifying it on the sequence
          let attributesFromComposite = {};

          if ('fixed' in component.attributes) {
            attributesFromComposite = convertAttributesForComponentType({
              attributes: { fixed: component.attributes.fixed },
              componentType,
              componentInfoObjects,
              compositeAttributesObj: {},
              compositeCreatesNewNamespace: component.attributes.newNamespace,
            });
          }

          let serializedComponent = {
            componentType,
            attributes: attributesFromComposite,
            state: { value: componentValue, fixed: true },
          };

          newSerializedReplacements.push(serializedComponent);
        }

        let processResult = processAssignNames({
          assignNames: component.doenetAttributes.assignNames,
          serializedComponents: newSerializedReplacements,
          parentName: component.componentName,
          parentCreatesNewNamespace: component.attributes.newNamespace,
          componentInfoObjects,
          indOffset: prevlength,
        });

        let replacementInstruction = {
          changeType: 'add',
          changeTopLevelReplacements: true,
          firstReplacementInd: prevlength,
          serializedReplacements: processResult.serializedComponents,
          replacementsToWithhold: 0,
          assignNamesOffset: prevlength,
        };
        replacementChanges.push(replacementInstruction);
      }
    }

    lrp.type = component.stateValues.type;
    lrp.from = component.stateValues.from;
    lrp.length = component.stateValues.length;
    lrp.step = component.stateValues.step;
    lrp.exclude = component.stateValues.exclude;

    // console.log(replacementChanges);
    return replacementChanges;
  }

  get allPotentialRendererTypes() {
    let allPotentialRendererTypes = [
      this.componentInfoObjects.allComponentClasses[
        this.stateValues.type === 'letters' ? 'text' : this.stateValues.type
      ].rendererType,
    ];
    return allPotentialRendererTypes;
  }
}
