import BaseComponent from './abstract/BaseComponent';

export class Pattern extends BaseComponent {
  static componentType = 'pattern';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'exactlyOneChild',
      componentType: '_base',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }
}

export class Replace extends BaseComponent {
  static componentType = 'replace';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let breakStringIntoTwoStringsByCommas = function ({
      activeChildrenMatched,
    }) {
      let stringChild = activeChildrenMatched[0];
      let pieces = stringChild.state.value.split(',');
      if (pieces.length !== 2) {
        return { success: false };
      }
      let newChildren = pieces.map((x) => ({
        componentType: 'string',
        state: { value: x.trim() },
      }));
      return {
        success: true,
        newChildren: newChildren,
        toDelete: [stringChild.componentName],
      };
    };

    let exactlyOneString = childLogic.newLeaf({
      name: 'exactlyOneString',
      componentType: 'string',
      number: 1,
      isSugar: true,
      replacementFunction: breakStringIntoTwoStringsByCommas,
    });

    let exactlyTwoChildren = childLogic.newLeaf({
      name: 'exactlyTwoChildren',
      componentType: '_base',
      number: 2,
    });

    childLogic.newOperator({
      name: 'SugarXorChildren',
      operator: 'xor',
      propositions: [exactlyOneString, exactlyTwoChildren],
      setAsBase: true,
    });

    return childLogic;
  }
}
