import CompositeComponent from './abstract/CompositeComponent';
import { postProcessCopy } from '../utils/copy';
import me from 'math-expressions';

export default class Intersection extends CompositeComponent {
  static componentType = 'intersection';

  static stateVariableToEvaluateAfterReplacements = 'readyToExpandWhenResolved';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroLines',
      componentType: 'line',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.lineChildren = {
      returnDependencies: () => ({
        lineChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroLines',
          variableNames: [
            'numericalCoeff0',
            'numericalCoeffvar1',
            'numericalCoeffvar2',
            'nDimensions',
          ],
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          lineChildren: dependencyValues.lineChildren,
        },
      }),
    };

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        lineChildren: {
          dependencyType: 'stateVariable',
          variableName: 'lineChildren',
        },
      }),
      markStale: () => ({ updateReplacements: true }),
      definition: function () {
        return { newValues: { readyToExpandWhenResolved: true } };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({ component, components }) {
    let numberLineChildren = component.stateValues.lineChildren.length;

    if (numberLineChildren === 0) {
      return { replacements: [] };
    }

    // intersection of one object is the object itself
    if (numberLineChildren === 1) {
      let childName = component.stateValues.lineChildren[0].componentName;
      let serializedChild = components[childName].serialize({ forCopy: true });
      if (!serializedChild.state) {
        serializedChild.state = {};
      }
      serializedChild.state.draggable = false;
      serializedChild.state.fixed = true;

      return {
        replacements: postProcessCopy({
          serializedComponents: [serializedChild],
          componentName: component.componentName,
        }),
      };
    }

    if (numberLineChildren > 2) {
      console.warn(
        "Haven't implemented intersection for more than two objects",
      );
      return { replacements: [] };
    }

    // for now, have only implemented for two lines
    // in 2D with constant coefficients
    let line1 = component.stateValues.lineChildren[0];
    let line2 = component.stateValues.lineChildren[1];

    if (
      line1.stateValues.nDimensions !== 2 ||
      line2.stateValues.nDimensions !== 2
    ) {
      console.log('Intersection of lines implemented only in 2D');
      return { replacements: [] };
    }

    // only implement for constant coefficients
    let a1 = line1.stateValues.numericalCoeffvar1;
    let b1 = line1.stateValues.numericalCoeffvar2;
    let c1 = line1.stateValues.numericalCoeff0;
    let a2 = line2.stateValues.numericalCoeffvar1;
    let b2 = line2.stateValues.numericalCoeffvar2;
    let c2 = line2.stateValues.numericalCoeff0;

    if (
      !(
        Number.isFinite(a1) &&
        Number.isFinite(b1) &&
        Number.isFinite(c1) &&
        Number.isFinite(a2) &&
        Number.isFinite(b2) &&
        Number.isFinite(c2)
      )
    ) {
      console.log(
        'Intersection of lines implemented only for constant coefficients',
      );
      return { replacements: [] };
    }

    let d = a1 * b2 - a2 * b1;

    if (Math.abs(d) < 1e-14) {
      if (Math.abs(c2 * a1 - c1 * a2) > 1e-14) {
        // parallel lines
        return { replacements: [] };
      } else if (
        (a1 === 0 && b1 === 0 && c1 === 0) ||
        (a2 === 0 && b2 === 0 && c2 === 0)
      ) {
        // at least one line not defined
        return { replacements: [] };
      } else {
        // two identical lines, return first line
        let childName = component.stateValues.lineChildren[0].componentName;
        let serializedChild = components[childName].serialize({
          forCopy: true,
        });
        if (!serializedChild.state) {
          serializedChild.state = {};
        }
        serializedChild.state.draggable = false;
        serializedChild.state.fixed = true;

        return {
          replacements: postProcessCopy({
            serializedComponents: [serializedChild],
            componentName: component.componentName,
          }),
        };
      }
    }

    // two intersecting lines, return point
    let x = (c2 * b1 - c1 * b2) / d;
    let y = (c1 * a2 - c2 * a1) / d;
    let coords = me.fromAst(['vector', x, y]);

    return {
      replacements: [
        {
          componentType: 'point',
          state: { coords, draggable: false, fixed: true },
        },
      ],
    };
  }

  static calculateReplacementChanges({ component, components }) {
    let replacementChanges = [];

    let serializedIntersections = this.createSerializedReplacements({
      component,
      components,
    }).replacements;

    let nNewIntersections = serializedIntersections.length;

    let recreateReplacements = true;

    if (nNewIntersections === component.replacements.length) {
      recreateReplacements = false;

      for (let ind = 0; ind < nNewIntersections; ind++) {
        if (
          serializedIntersections[ind].componentType !==
          component.replacements[ind].componentType
        ) {
          // found a different type of replacement, so recreate from scratch
          recreateReplacements = true;
          break;
        }
        // only need to change state variables

        if (serializedIntersections[ind].state === undefined) {
          console.warn(
            'No state by which to update intersection component, so recreating',
          );
          recreateReplacements = true;
          break;
        }

        let replacementInstruction = {
          changeType: 'updateStateVariables',
          component: component.replacements[ind],
          stateChanges: serializedIntersections[ind].state,
        };
        replacementChanges.push(replacementInstruction);
      }
    }

    if (recreateReplacements === false) {
      return replacementChanges;
    }

    // replace with new intersection
    let replacementInstruction = {
      changeType: 'add',
      changeTopLevelReplacements: true,
      firstReplacementInd: 0,
      numberReplacementsToReplace: component.replacements.length,
      serializedReplacements: serializedIntersections,
    };

    return [replacementInstruction];
  }
}
