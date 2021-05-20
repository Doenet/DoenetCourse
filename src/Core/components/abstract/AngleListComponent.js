import BaseComponent from './BaseComponent';
import { breakStringsAndOthersIntoComponentsByStringCommas } from '../commonsugar/breakstrings';

export default class AngleListComponent extends BaseComponent {
  static componentType = '_angleListComponent';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.hide = { default: true };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let AtLeastZeroAngles = childLogic.newLeaf({
      name: 'AtLeastZeroAngles',
      componentType: 'angle',
      comparison: 'atLeast',
      number: 0,
    });

    let breakIntoAnglesByCommas =
      breakStringsAndOthersIntoComponentsByStringCommas((x) => ({
        componentType: 'angle',
        children: [
          {
            componentType: 'math',
            children: x,
          },
        ],
      }));

    let AtLeastOneString = childLogic.newLeaf({
      name: 'AtLeastOneString',
      componentType: 'string',
      comparison: 'atLeast',
      number: 1,
    });

    let AtLeastOneMath = childLogic.newLeaf({
      name: 'AtLeastOneMath',
      componentType: 'math',
      comparison: 'atLeast',
      number: 1,
    });

    let StringsAndMaths = childLogic.newOperator({
      name: 'StringsAndMaths',
      operator: 'or',
      propositions: [AtLeastOneString, AtLeastOneMath],
      requireConsecutive: true,
      isSugar: true,
      replacementFunction: breakIntoAnglesByCommas,
    });

    childLogic.newOperator({
      name: 'AnglesXorSugar',
      operator: 'xor',
      propositions: [AtLeastZeroAngles, StringsAndMaths],
      setAsBase: true,
    });

    return childLogic;
  }

  updateState(args = {}) {
    if (args.init) {
      this._state.angles = { trackChanges: true };
    }

    super.updateState(args);

    if (!this.childLogicSatisfied) {
      this.unresolvedState.angles = true;
      this.unresolvedState.nAngles = true;
      return;
    }

    let trackChanges = this.currentTracker.trackChanges;
    let childrenChanged = trackChanges.childrenChanged(this.componentName);

    if (childrenChanged) {
      delete this.unresolvedState.angles;
      delete this.unresolvedState.nAngles;

      let AtLeastZeroAngles =
        this.childLogic.returnMatches('AtLeastZeroAngles');
      this.state.nAngles = AtLeastZeroAngles.length;
      this.state.angles = AtLeastZeroAngles.map((i) => this.activeChildren[i]);
    }
  }

  initializeRenderer() {
    if (this.renderer === undefined) {
      this.renderer = new this.availableRenderers.container({
        key: this.componentName,
      });
    }
  }

  updateChildrenWhoRender() {
    this.childrenWhoRender = this.state.angles.map((x) => x.componentName);
  }

  // allowDownstreamUpdates() {
  //   return true;
  // }

  // get variablesUpdatableDownstream() {
  //   return ["angles"];
  // }

  // calculateDownstreamChanges({ stateVariablesToUpdate, stateVariableChangesToSave,
  //   dependenciesToUpdate, dryRun }) {

  //   let angleNames = this.state.angles.map(x => x.componentName);

  //   let newAngle = stateVariablesToUpdate.angles;

  //   for (let ind in angleNames) {
  //     if (dryRun === true) {
  //       dependenciesToUpdate[angleNames[ind]] = { angle: undefined };
  //     } else {
  //       dependenciesToUpdate[angleNames[ind]] = { angle: newAngle[ind] };
  //     }
  //   }

  //   let newStateVariables = { angles: newAngle };

  //   this.updateShadowSources({
  //     newStateVariables: newStateVariables,
  //     dependenciesToUpdate: dependenciesToUpdate,
  //     dryRun: dryRun
  //   });

  //   return true;

  // }
}
