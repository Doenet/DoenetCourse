import NumberComponent from './Number';
import SelectFromSequence from './SelectFromSequence';
import me from 'math-expressions';

export default class RandomNumber extends NumberComponent {
  static componentType = 'randomNumber';

  static previewSerializedComponent({ sharedParameters }) {
    // tell to/from children to be numbers
    sharedParameters.typeForSelectableType = 'number';

    // the idea of defaultToPrescribedParameters is to tell statistic children
    // like mean and standard deviation that they are to represent
    // the prescribed value of a quantity, rather than calculate the
    // quantity from data
    sharedParameters.defaultToPrescribedParameters = true;

    return;
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    // possible types
    // discrete: determined by from, to, and step
    // uniform: between from and to (step ignored)
    // gaussian: gaussian with prescribed mean and standard deviation
    attributes.type = { default: 'discrete' };
    attributes.mean = { default: null };
    attributes.standarddeviation = { default: null };
    attributes.variance = { default: null };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.deleteAllLogic();

    function fromToAsString({ activeChildrenMatched, sharedParameters }) {
      let stringChild = activeChildrenMatched[0];
      let stringPieces = stringChild.state.value.split(',');

      if (stringPieces.length === 1) {
        let toComponent = {
          componentType: 'to',
          children: [
            {
              componentType: 'number',
              children: [
                {
                  createdComponent: true,
                  componentName: stringChild.componentName,
                },
              ],
            },
          ],
        };
        return {
          success: true,
          newChildren: [toComponent],
        };
      } else if (stringPieces.length === 2) {
        let fromComponent = {
          componentType: 'from',
          children: [
            {
              componentType: 'number',
              children: [
                {
                  componentType: 'string',
                  state: { value: stringPieces[0].trim() },
                },
              ],
            },
          ],
        };
        let toComponent = {
          componentType: 'to',
          children: [
            {
              componentType: 'number',
              children: [
                {
                  componentType: 'string',
                  state: { value: stringPieces[1].trim() },
                },
              ],
            },
          ],
        };
        return {
          success: true,
          newChildren: [fromComponent, toComponent],
          toDelete: [stringChild.componentName],
        };
      } else {
        return { success: false };
      }
    }

    let exactlyOneString = childLogic.newLeaf({
      name: 'exactlyOneString',
      componentType: 'string',
      number: 1,
      isSugar: true,
      replacementFunction: fromToAsString,
    });

    let atMostOneFrom = childLogic.newLeaf({
      name: 'atMostOneFrom',
      componentType: 'from',
      comparison: 'atMost',
      number: 1,
    });

    let atMostOneTo = childLogic.newLeaf({
      name: 'atMostOneTo',
      componentType: 'to',
      comparison: 'atMost',
      number: 1,
    });

    let toFrom = childLogic.newOperator({
      name: 'toFrom',
      operator: 'and',
      propositions: [atMostOneFrom, atMostOneTo],
    });

    let sugarXorToFrom = childLogic.newOperator({
      name: 'sugarXorToFrom',
      operator: 'xor',
      propositions: [exactlyOneString, toFrom],
    });

    let atMostOneStep = childLogic.newLeaf({
      name: 'atMostOneStep',
      componentType: 'step',
      comparison: 'atMost',
      number: 1,
    });

    let atMostOneCount = childLogic.newLeaf({
      name: 'atMostOneCount',
      componentType: 'count',
      comparison: 'atMost',
      number: 1,
    });

    let atLeastZeroExcludes = childLogic.newLeaf({
      name: 'atLeastZeroExcludes',
      componentType: 'exclude',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'sequenceLogic',
      operator: 'and',
      propositions: [
        sugarXorToFrom,
        atMostOneStep,
        atMostOneCount,
        atLeastZeroExcludes,
      ],
      setAsBase: true,
    });

    return childLogic;
  }

  updateState(args = {}) {
    if (args.init) {
      this.state.rng = new this.sharedParameters.rngClass();

      // set up state variable so don't have to check if defined later
      if (this._state.from === undefined) {
        this._state.from = { trackChanges: true };
      }
      if (this._state.to === undefined) {
        this._state.to = { trackChanges: true };
      }
      if (this._state.step === undefined) {
        this._state.step = { trackChanges: true };
      }
      if (this._state.count === undefined) {
        this._state.count = { trackChanges: true };
      }
      if (this._state.exclude === undefined) {
        this._state.exclude = { trackChanges: true, value: [] };
      }
    }
    super.updateState(args);

    if (!this.childLogicSatisfied) {
      this.unresolvedState.number = true;
      this.unresolvedState.value = true;
      this.unresolvedState.latex = true;
      this.unresolvedState.text = true;
      return;
    }

    delete this.unresolvedState.number;
    delete this.unresolvedState.value;
    delete this.unresolvedState.latex;
    delete this.unresolvedState.text;

    this.constructor.getRandomNumberParametersFromChildren(this);

    if (Object.keys(this.unresolvedState).length > 0) {
      this.unresolvedState.number = true;
      this.unresolvedState.value = true;
      this.unresolvedState.latex = true;
      this.unresolvedState.text = true;
      return;
    }

    if (this._state.value.essential) {
      if (!this._state.number.essential) {
        this.state.number = this.state.value.evaluate_to_constant();
      }
    } else if (!this._state.number.essential) {
      // generate random number only if number and value
      // aren't essential state variables

      if (this.state.type === 'gaussian') {
        if (this.state.mean === null) {
          this.state.mean = 0;
        }
        if (this.state.variance === null) {
          if (this.state.standarddeviation === null) {
            this.state.standarddeviation = 1;
          }
          this.state.variance = this.state.standarddeviation ** 2;
        } else if (this.state.standarddeviation === null) {
          this.state.standarddeviation = Math.sqrt(this.state.variance);
        } else {
          // if both standarddeviation and variance defined,
          // standarddeviation wins
          this.state.variance = this.state.standarddeviation ** 2;
        }

        if (
          !(this.state.standarddeviation > 0) ||
          !Number.isFinite(this.state.mean)
        ) {
          let message =
            'Invalid mean (' +
            this.state.mean +
            ') or standard deviation (' +
            this.state.standarddeviation +
            ') for a gaussian random variable.';

          console.warn(message);
          this.state.number = NaN;
        } else {
          // Standard Normal variate using Box-Muller transform.
          let u = 0,
            v = 0;
          while (u === 0) {
            u = this.state.rng.random();
          }
          while (v === 0) {
            v = this.state.rng.random();
          }
          let standardNormal =
            Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
          this.state.number =
            this.state.mean + this.state.standarddeviation * standardNormal;
        }
      } else if (this.state.type === 'uniform') {
        if (this.state.from === undefined) {
          this.state.from = 0;
        }
        if (this.state.to === undefined) {
          this.state.to = 1;
        }

        this.state.number =
          this.state.from +
          this.state.rng.random() * (this.state.to - this.state.from);
      } else {
        // type === "discrete"

        if (this.state.validParameters) {
          // if have a parameter that wasn't from child or essential state variable
          // reset to undefined
          if (!this.state.basedOnFrom) {
            this.state.from = undefined;
          }
          if (!this.state.basedOnTo) {
            this.state.to = undefined;
          }
          if (!this.state.basedOnStep) {
            this.state.step = undefined;
          }
          if (!this.state.basedOnCount) {
            this.state.count = undefined;
          }
          if (!this.state.excludeChildren && !this._state.exclude.essential) {
            this.state.exclude = [];
          }

          SelectFromSequence.calculateSequenceParameters(this.state);

          this.state.number = SelectFromSequence.selectValues({
            stateObj: this.state,
            rng: this.state.rng,
          })[0];
        } else {
          this.state.number = NaN;
        }
      }
    }

    if (Number.isFinite(this.state.number)) {
      this.state.value = me.fromAst(this.state.number);
    } else {
      this.state.value = me.fromAst('\uFF3F'); // long underscore
    }

    let rounded = this.state.value.round_numbers_to_precision(
      this.state.displaydigits,
    );
    this.state.latex = rounded.toLatex();
    this.state.text = rounded.toString();
  }

  static getRandomNumberParametersFromChildren(component) {
    component.state.validParameters = true;
    component.state.parameterChanged = false;

    if (component.state.type === 'gaussian') {
      // to/from/count/step/exclude ignored for gaussian
      return;
    }

    let trackChanges = component.currentTracker.trackChanges;

    if (
      trackChanges.getVariableChanges({
        component: component,
        variable: 'type',
      })
    ) {
      if (!['uniform', 'discrete'].includes(component.state.type)) {
        console.warn(
          'Unrecognized type (' +
            component.state.type +
            ') for random number, setting to discrete.',
        );
        component.state.type = 'discrete';
      }
    }

    let childrenChanged = trackChanges.childrenChanged(component.componentName);

    if (childrenChanged) {
      let fromInds = component.childLogic.returnMatches('atMostOneFrom');
      if (fromInds.length === 1) {
        component.state.fromChild = component.activeChildren[fromInds[0]];
        component.state.basedOnFrom = true;
      } else {
        delete component.state.fromChild;
        if (component._state.from.essential) {
          component.state.basedOnFrom = true;
        }
      }

      let toInds = component.childLogic.returnMatches('atMostOneTo');
      if (toInds.length === 1) {
        component.state.toChild = component.activeChildren[toInds[0]];
        component.state.basedOnTo = true;
      } else {
        delete component.state.toChild;
        if (component._state.to.essential) {
          component.state.basedOnTo = true;
        }
      }
    }

    if (component.state.fromChild) {
      if (component.state.fromChild.unresolvedState.value) {
        component.unresolvedState.from = true;
      } else if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: component.state.fromChild,
          variable: 'value',
        })
      ) {
        component.state.from = component.state.fromChild.state.value;
        component.state.parameterChanged = true;
      }
    } else if (
      component._state.from.essential &&
      trackChanges.getVariableChanges({
        component: component,
        variable: 'from',
      })
    ) {
      component.state.parameterChanged = true;
    }

    if (component.state.toChild) {
      if (component.state.toChild.unresolvedState.value) {
        component.unresolvedState.to = true;
      } else if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: component.state.toChild,
          variable: 'value',
        })
      ) {
        component.state.to = component.state.toChild.state.value;
        component.state.parameterChanged = true;
      }
    } else if (
      component._state.to.essential &&
      trackChanges.getVariableChanges({
        component: component,
        variable: 'to',
      })
    ) {
      component.state.parameterChanged = true;
    }

    if (component.state.type === 'uniform') {
      // ignore step/count/exclude for uniform
      return;
    }

    if (childrenChanged) {
      let stepInds = component.childLogic.returnMatches('atMostOneStep');
      if (stepInds.length === 1) {
        component.state.stepChild = component.activeChildren[stepInds[0]];
        component.state.basedOnStep = true;
      } else {
        delete component.state.stepChild;
        if (component._state.step.essential) {
          component.basedOnStep = true;
        }
      }

      let countInds = component.childLogic.returnMatches('atMostOneCount');
      if (countInds.length === 1) {
        component.state.countChild = component.activeChildren[countInds[0]];
        component.state.basedOnCount = true;
      } else {
        delete component.state.countChild;
        if (component._state.count.essential) {
          component.state.basedOnCount = true;
        }
      }

      let excludeInds = component.childLogic.returnMatches(
        'atLeastZeroExcludes',
      );
      if (excludeInds.length > 0) {
        component.state.excludeChildren = excludeInds.map(
          (x) => component.activeChildren[x],
        );
      } else {
        delete component.state.excludeChildren;
      }
    }

    if (component.state.stepChild) {
      if (component.state.stepChild.unresolvedState.value) {
        component.unresolvedState.step = true;
        component.state.step = undefined;
      } else if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: component.state.stepChild,
          variable: 'value',
        })
      ) {
        component.state.step = component.state.stepChild.state.value;
        component.state.parameterChanged = true;
      }
    } else if (
      component._state.step.essential &&
      trackChanges.getVariableChanges({
        component: component,
        variable: 'step',
      })
    ) {
      component.state.parameterChanged = true;
    }

    if (component.state.countChild) {
      if (component.state.countChild.unresolvedState.value) {
        component.unresolvedState.count = true;
        component.state.count = undefined;
      } else if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: component.state.countChild,
          variable: 'number',
        })
      ) {
        component.state.count = component.state.countChild.state.number;
        component.state.parameterChanged = true;
      }
    } else if (
      component._state.count.essential &&
      trackChanges.getVariableChanges({
        component: component,
        variable: 'count',
      })
    ) {
      component.state.parameterChanged = true;
    }

    if (component.state.excludeChildren) {
      if (
        component.state.excludeChildren.some((x) => x.unresolvedState.value)
      ) {
        component.unresolvedState.exclude = true;
      } else if (
        childrenChanged ||
        component.state.excludeChildren.some((x) =>
          trackChanges.getVariableChanges({
            component: x,
            variable: 'values',
          }),
        )
      ) {
        component.state.exclude = component.state.excludeChildren.reduce(
          (a, c) => [...a, ...c.state.values],
          [],
        );
        component.state.parameterChanged = true;
      }
    } else if (
      component._state.exclude.essential &&
      trackChanges.getVariableChanges({
        component: component,
        variable: 'exclude',
      })
    ) {
      component.state.parameterChanged = true;
    }

    // console.log(component.state.from);
    // console.log(component.state.to);
    // console.log(component.state.step);
    // console.log(component.state.count);

    if (component.state.count !== undefined) {
      if (
        !Number.isInteger(component.state.count) ||
        component.state.count < 0
      ) {
        console.log(
          'Invalid count for discrete uniform random number.  Must be a non-negative integer.',
        );
        component.state.validParameters = false;
      }
    }

    if (component.state.step !== undefined) {
      // convert step to number
      if (!Number.isFinite(component.state.step)) {
        if (component.state.step.evaluate_to_constant) {
          component.state.step = component.state.step.evaluate_to_constant();
        }
        if (!Number.isFinite(component.state.step)) {
          console.log(
            'Invalid step for discrete uniform random number.  Must be a number.',
          );
          component.state.validParameters = false;
        }
      }
    }
  }
}
