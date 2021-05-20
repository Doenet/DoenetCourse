import BlockComponent from './abstract/BlockComponent';

export default class Container extends BlockComponent {
  static componentType = 'container';
  static renderChildren = true;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'anything',
      componentType: '_base',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }
}
