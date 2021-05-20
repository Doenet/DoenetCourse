import MathComponent from './Math';
import me from 'math-expressions';
import {
  breakEmbeddedStringByCommas,
  breakIntoVectorComponents,
} from './commonsugar/breakstrings';

export default class DiscreteInfiniteSet extends MathComponent {
  static componentType = 'discreteInfiniteSet';

  static previewSerializedComponent({
    serializedComponent,
    sharedParameters,
    components,
  }) {
    if (serializedComponent.children === undefined) {
      return;
    }

    let simplifyInd;
    for (let [ind, child] of serializedComponent.children.entries()) {
      if (
        child.componentType === 'simplify' ||
        (child.createdComponent &&
          components[child.componentName].componentType === 'simplify')
      ) {
        simplifyInd = ind;
        break;
      }
    }

    let creationInstructions = [];
    if (simplifyInd !== undefined) {
      creationInstructions.push({ createChildren: [simplifyInd] });
    }

    creationInstructions.push({ callMethod: 'setUpSimplify' });
    return creationInstructions;
  }

  static setUpSimplify({
    sharedParameters,
    definingChildrenSoFar,
    serializedComponent,
  }) {
    // check for simplify child
    let simplifyChild;
    for (let child of definingChildrenSoFar) {
      if (child !== undefined && child.componentType === 'simplify') {
        simplifyChild = child;
        break;
      }
    }

    if (simplifyChild !== undefined) {
      sharedParameters.simplifyChild = simplifyChild;
    }
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.minindex = { default: me.fromAst(['-', Infinity]) };
    attributes.maxindex = { default: me.fromAst(Infinity) };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.deleteAllLogic();

    let breakStringIntoChildren = function ({
      activeChildrenMatched,
      sharedParameters,
    }) {
      // know it a string
      let results = breakEmbeddedStringByCommas({
        childrenList: activeChildrenMatched,
      });

      // need two pieces
      if (!results.success || results.pieces.length !== 2) {
        return { success: false };
      }

      let toDelete = results.toDelete;
      let newChildren = [];

      // second part is offsets
      // which could have more than one offset, if it written as a vector
      let offsetsChildren = [];

      let res = breakIntoVectorComponents(results.pieces[0]);
      if (res.foundVector) {
        // vector components are offset children of offsets
        for (let comp of res.vectorComponents) {
          let newComponent = {
            componentType: 'offset',
            children: comp,
          };
          if (sharedParameters.simplifyChild !== undefined) {
            newComponent.children.push({
              componentType: 'ref',
              children: [
                {
                  componentType: 'reftarget',
                  state: {
                    targetName: sharedParameters.simplifyChild.componentName,
                  },
                },
              ],
            });
          }
          offsetsChildren.push(newComponent);
        }
      } else {
        offsetsChildren = results.pieces[0];
      }
      newChildren.push({
        componentType: 'offsets',
        children: offsetsChildren,
      });

      // second part is period
      let periodChildren = result.pieces[1];
      if (sharedParameters.simplifyChild !== undefined) {
        periodChildren.push({
          componentType: 'ref',
          children: [
            {
              componentType: 'reftarget',
              state: {
                targetName: sharedParameters.simplifyChild.componentName,
              },
            },
          ],
        });
        newChildren.push({
          componentType: 'period',
          children: periodChildren,
        });
      }

      return { success: true, newChildren: newChildren, toDelete: toDelete };
    };

    let exactlyOneString = childLogic.newLeaf({
      name: 'exactlyOneString',
      componentType: 'string',
      number: 1,
      isSugar: true,
      replacementFunction: breakStringIntoChildren,
    });

    let atMostOneOffsets = childLogic.newLeaf({
      name: 'atMostOneOffsets',
      componentType: 'offsets',
      comparison: 'atMost',
      number: 1,
    });

    let atMostOnePeriod = childLogic.newLeaf({
      name: 'atMostOnePeriod',
      componentType: 'period',
      comparison: 'atMost',
      number: 1,
    });

    let offsetsAndPeriod = childLogic.newOperator({
      name: 'offsetsAndPeriod',
      operator: 'and',
      propositions: [atMostOneOffsets, atMostOnePeriod],
    });

    childLogic.newOperator({
      name: 'SugarXorOffsetsPeriod',
      operator: 'xor',
      propositions: [exactlyOneString, offsetsAndPeriod],
      setAsBase: true,
    });

    return childLogic;
  }

  updateState(args = {}) {
    if (args.init) {
      this.makePublicStateVariable({
        variableName: 'offsets',
        componentType: 'offsets',
      });
      this.makePublicStateVariable({
        variableName: 'period',
        componentType: 'period',
      });
      this.makePublicStateVariable({
        variableName: 'redundantoffsets',
        componentType: 'boolean',
      });
    }

    super.updateState(args);

    if (!this.childLogicSatisfied) {
      this.unresolvedState.offsets = true;
      this.unresolvedState.period = true;
      this.unresolvedState.redundantoffsets = true;
      return;
    }

    let recalculateValue = false;
    let foundInvalidValue = false;

    let trackChanges = this.currentTracker.trackChanges;
    let childrenChanged = trackChanges.childrenChanged(this.componentName);

    if (childrenChanged) {
      recalculateValue = true;

      let atMostOneOffsets = this.childLogic.returnMatches('atMostOneOffsets');
      if (atMostOneOffsets.length === 1) {
        this.state.offsetsChild = this.activeChildren[atMostOneOffsets[0]];
      } else {
        delete this.state.offsetsChild;
        if (!this._state.value.essential) {
          foundInvalidValue = true;
          this.state.offsets = [];
          this.state.nOffsets = 0;
          this.state.value = me.fromAst('\uFF3F'); // long underscore
        } else if (
          trackChanges.getVariableChanges({
            component: this,
            variable: 'value',
          })
        ) {
          recalculateValue = true;
        }
      }

      let atMostOnePeriod = this.childLogic.returnMatches('atMostOnePeriod');
      if (atMostOnePeriod.length === 1) {
        this.state.periodChild = this.activeChildren[atMostOnePeriod[0]];
      } else {
        delete this.state.periodChild;
        if (!this._state.value.essential) {
          foundInvalidValue = true;
          this.state.period = me.fromAst('\uFF3F'); // long underscore;
          this.state.value = me.fromAst('\uFF3F'); // long underscore
        } else if (
          trackChanges.getVariableChanges({
            component: this,
            variable: 'value',
          })
        ) {
          recalculateValue = true;
        }
      }
    }

    if (foundInvalidValue) {
      delete this.unresolvedState.value;
      delete this.unresolvedState.latex;
      delete this.unresolvedState.text;
      delete this.unresolvedState.offsets;
      delete this.unresolvedState.period;
      delete this.unresolvedState.redundantoffsets;
      return;
    }

    if (this.state.offsetsChild) {
      if (this.state.offsetsChild.unresolvedState.maths) {
        this.unresolvedState.value = true;
        this.unresolvedState.latex = true;
        this.unresolvedState.text = true;
        this.unresolvedState.offsets = true;
        this.unresolvedState.period = true;
        this.unresolvedState.redundantoffsets = true;
        return;
      }

      if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: this.state.offsetsChild,
          variable: 'maths',
        })
      ) {
        recalculateValue = true;
        this.state.offsets = this.state.offsetsChild.state.maths;
        this.state.nOffsets = this.state.offsetsChild.state.ncomponents;
      }
    }

    if (this.state.periodChild) {
      if (this.state.periodChild.unresolvedState.value) {
        this.unresolvedState.value = true;
        this.unresolvedState.latex = true;
        this.unresolvedState.text = true;
        this.unresolvedState.offsets = true;
        this.unresolvedState.period = true;
        this.unresolvedState.redundantoffsets = true;
        return;
      }

      if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: this.state.periodChild,
          variable: 'value',
        })
      ) {
        recalculateValue = true;
        this.state.period = this.state.periodChild.state.value;
      }
    }

    if (!recalculateValue) {
      if (
        !this._state.value.essential ||
        !trackChanges.getVariableChanges({
          component: this,
          variable: 'value',
        })
      ) {
        return;
      }
    }

    delete this.unresolvedState.value;
    delete this.unresolvedState.latex;
    delete this.unresolvedState.text;
    delete this.unresolvedState.offsets;
    delete this.unresolvedState.period;
    delete this.unresolvedState.redundantoffsets;

    if (this._state.value.essential) {
      if (
        Array.isArray(this.state.value.tree) &&
        this.state.value.tree[0] === 'discrete_infinite_set'
      ) {
        // passed in discrete infinite set as an essential state variable
        // reconstruct parameters from this variable
        let tuple = this.state.value.tree[1];
        this.state.offsets = [me.fromAst(tuple[1])];
        this.state.period = me.fromAst(tuple[2]);
        this.state.minindex = me.fromAst(tuple[3]);
        this.state.maxindex = me.fromAst(tuple[4]);

        for (let ind = 2; ind < this.state.value.tree.length; ind++) {
          tuple = this.state.value.tree[ind];
          this.state.offsets.push(me.fromAst(tuple[1]));
          if (!this.state.period.equals(me.fromAst(tuple[2]))) {
            console.warn(
              'Have not implemented discrete infinite set with different periods.',
            );
          }
          if (!this.state.minindex.equals(me.fromAst(tuple[3]))) {
            console.warn(
              'Have not implemented discrete infinite set with different minindices.',
            );
          }
          if (!this.state.maxindex.equals(me.fromAst(tuple[4]))) {
            console.warn(
              'Have not implemented discrete infinite set with different maxindices.',
            );
          }
        }
        this.state.nOffsets = this.state.value.tree.length - 1;
      } else {
        this.state.value = me.fromAst('\uFF3F'); // long underscore
        this.state.period = me.fromAst('uFF3F');
        this.state.offsets = [];
      }
    } else if (
      this.state.nOffsets === 0 ||
      this.state.period.tree === '\uFF3F'
    ) {
      this.state.value = me.fromAst('\uFF3F'); // long underscore
    } else if (this.state.nOffsets === 1) {
      this.state.value = me.create_discrete_infinite_set({
        offsets: this.state.offsets[0],
        periods: this.state.period,
        min_index: this.state.minindex,
        max_index: this.state.maxindex,
      });
    } else {
      let offsets = me.fromAst([
        'list',
        ...this.state.offsets.map((x) => x.tree),
      ]);
      this.state.value = me.create_discrete_infinite_set({
        offsets: offsets,
        periods: this.state.period,
        min_index: this.state.minindex,
        max_index: this.state.maxindex,
      });
    }

    // check if have duplicate offsets
    this.state.redundantoffsets = false;
    let periodNum = this.state.period.evaluate_to_constant();
    if (periodNum !== null) {
      for (let ind1 = 0; ind1 < this.state.nOffsets; ind1++) {
        for (let ind2 = 0; ind2 < ind1; ind2++) {
          let offsetDiff = this.state.offsets[ind1]
            .subtract(this.state.offsets[ind2])
            .evaluate_to_constant();
          if (
            offsetDiff !== null &&
            Math.abs(offsetDiff % periodNum) < 1e-10 * periodNum
          ) {
            this.state.redundantoffsets = true;
            break;
          }
        }
        if (this.state.redundantoffsets) {
          break;
        }
      }
    }

    this.state.latex = '';
  }
}
