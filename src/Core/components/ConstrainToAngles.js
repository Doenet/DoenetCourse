import ConstraintComponent from './abstract/ConstraintComponent';

export default class ConstrainToAngles extends ConstraintComponent {
  static componentType = 'constrainToAngles';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let addAngles = function ({ activeChildrenMatched }) {
      // add <angles> around children
      let anglesChildren = [];
      for (let child of activeChildrenMatched) {
        anglesChildren.push({
          createdComponent: true,
          componentName: child.componentName,
        });
      }
      return {
        success: true,
        newChildren: [{ componentType: 'angles', children: anglesChildren }],
      };
    };

    let AtLeastOneAngle = childLogic.newLeaf({
      name: 'AtLeastOneAngle',
      componentType: 'angle',
      comparison: 'atLeast',
      number: 1,
      isSugar: true,
      replacementFunction: addAngles,
    });

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
      replacementFunction: addAngles,
    });

    let AtMostOneAngles = childLogic.newLeaf({
      name: 'AtMostOneAngles',
      componentType: 'angles',
      comparison: 'atMost',
      number: 1,
    });

    let Angles = childLogic.newOperator({
      name: 'Angles',
      operator: 'xor',
      propositions: [AtLeastOneAngle, StringsAndMaths, AtMostOneAngles],
      setAsBase: true,
    });

    let AtMostOnePoint = childLogic.newLeaf({
      name: 'AtMostOnePoint',
      componentType: 'point',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'AnglesAndPoint',
      operator: 'and',
      propositions: [Angles, AtMostOnePoint],
      setAsBase: true,
    });

    return childLogic;
  }

  updateState(args = {}) {
    super.updateState(args);

    if (!this.childLogicSatisfied) {
      this.unresolvedState.angles = true;
      this.unresolvedState.offset = true;
      return;
    }

    let trackChanges = this.currentTracker.trackChanges;
    let childrenChanged = trackChanges.childrenChanged(this.componentName);

    if (childrenChanged) {
      let anglesInd = this.childLogic.returnMatches('AtMostOneAngles');

      if (anglesInd.length === 1) {
        this.state.anglesChild = this.activeChildren[anglesInd[0]];
      } else {
        delete this.state.anglesChild;
        this.state.angles = [];
        delete this.unresolvedState.angles;
      }

      let pointInd = this.childLogic.returnMatches('AtMostOnePoint');
      if (pointInd.length === 1) {
        this.state.pointChild = this.activeChildren[pointInd[0]];
      } else {
        delete this.state.pointChild;
        this.state.offset = [0, 0, 0];
        delete this.unresolvedState.offset;
      }
    }

    if (this.state.anglesChild) {
      if (this.state.anglesChild.unresolvedState.angles) {
        this.unresolvedState.angles = true;
        return;
      }

      if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: this.state.anglesChild,
          variable: 'angles',
        })
      ) {
        delete this.unresolvedState.angles;
        this.state.angles = this.state.anglesChild.state.angles;
      }
    }

    if (this.state.pointChild) {
      if (this.state.pointChild.unresolvedState.xs) {
        this.unresolvedState.offset = true;
        return;
      }

      if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: this.state.pointChild,
          variable: 'xs',
        })
      ) {
        delete this.unresolvedState.offset;

        this.state.offset = [];
        for (let i = 0; i < this.state.pointChild.state.ndimensions; i++) {
          let temp = this.state.pointChild.state.xs[i].evaluate_to_constant();
          if (!Number.isFinite(temp)) {
            this.state.offset = NaN;
            break;
          }
          this.state.offset.push(temp);
        }
      }
    }
  }

  applyTheConstraint({ x1, x2, x3, offset }) {
    // use the convention of x1, x2, and x3 for variable names
    // so that components can call constraints generically for n-dimensions

    if (this.unresolvedState.angles || this.unresolvedState.offset) {
      return {};
    }

    // only works in 2D
    if (x1 === undefined || x2 === undefined || x3 !== undefined) {
      return {};
    }

    // only works for numerical x1 and x2
    x1 = this.findFiniteNumericalValue(x1);
    x2 = this.findFiniteNumericalValue(x2);

    if (!Number.isFinite(x1) || !Number.isFinite(x2)) {
      return {};
    }

    if (offset === undefined) {
      offset = this.state.offset;
    }

    // if didn't get a numerical value for one of the offset components
    // return no constraint
    if (Number.isNaN(offset)) {
      return {};
    }

    let dx1 = x1 - offset[0];
    let dx2 = x2 - offset[1];

    let foundAngle = Math.atan2(dx2, dx1);

    let closestDistance = Infinity;
    let closestAngle;
    let closestInd;

    for (let [ind, angleComp] of this.state.angles.entries()) {
      let angle = angleComp.state.angle.evaluate_to_constant();

      if (!Number.isFinite(angle)) {
        continue;
      }

      let distanceToAngle = Math.abs(
        ((angle - foundAngle + Math.PI) % (2 * Math.PI)) - Math.PI,
      );

      if (distanceToAngle < closestDistance) {
        closestAngle = angle;
        closestInd = ind;
        closestDistance = distanceToAngle;
      }
    }

    if (closestAngle === undefined) {
      return {};
    }

    let mag = Math.sqrt(dx1 * dx1 + dx2 * dx2);

    let newX1 = offset[0] + mag * Math.cos(closestAngle);
    let newX2 = offset[1] + mag * Math.sin(closestAngle);

    let result = {
      variables: {
        x1: newX1,
        x2: newX2,
      },
      constraintIndices: [closestInd + 1],
      constrained: true,
    };

    return result;
  }
}
