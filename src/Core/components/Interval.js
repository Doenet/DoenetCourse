import MathComponent from './Math';

export default class Interval extends MathComponent {
  static componentType = 'interval';
  static rendererType = 'math';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.createIntervals.default = true;
    return attributes;
  }
}
