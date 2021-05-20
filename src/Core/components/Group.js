import Option from './Option';

export default class Group extends Option {
  static componentType = 'group';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.rendered.defaultValue = true;
    return attributes;
  }
}
