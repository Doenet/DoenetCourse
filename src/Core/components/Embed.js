import BlockComponent from './abstract/BlockComponent';

export default class Embed extends BlockComponent {
  static componentType = 'embed';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.width = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'width',
      defaultValue: { size: 500, isAbsolute: true },
      public: true,
      forRenderer: true,
    };
    attributes.height = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'height',
      defaultValue: { size: 500, isAbsolute: true },
      public: true,
      forRenderer: true,
    };
    attributes.geogebra = {
      createComponentOfType: 'text',
      createStateVariable: 'geogebra',
      defaultValue: null,
      public: true,
      forRenderer: true,
    };
    attributes.encodedGeogebraContent = {
      createComponentOfType: 'text',
      createStateVariable: 'encodedGeogebraContent',
      defaultValue: null,
      public: true,
      forRenderer: true,
    };
    attributes.fromMathInsight = {
      createComponentOfType: 'text',
      createStateVariable: 'fromMathInsight',
      defaultValue: null,
      public: true,
      forRenderer: true,
    };

    return attributes;
  }
}
