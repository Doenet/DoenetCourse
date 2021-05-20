import MathList from './MathList';

export default class Offsets extends MathList {
  static componentType = 'offsets';

  updateState(args = {}) {
    if (args.init === true) {
      this.makePublicStateVariableArray({
        variableName: 'offsets',
        componentType: 'offset',
      });
      this.makePublicStateVariableArrayEntry({
        entryName: 'offset',
        arrayVariableName: 'offsets',
      });
    }

    super.updateState(args);

    if (this.unresolvedState.maths) {
      this.unresolvedState.offsets = true;
      return;
    }

    if (
      this.currentTracker.trackChanges.getVariableChanges({
        component: this,
        variable: 'maths',
      })
    ) {
      this.state.offsets = [];
      for (let i = 1; i <= this.state.ncomponents; i++) {
        let offset = this.state.maths[i - 1];

        this.state.offsets.push(offset);
      }
    }
  }
}
