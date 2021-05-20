import BaseComponent from './BaseComponent';
import { returnDefaultStyleDefinitions } from '../../utils/style';

export default class GraphicalComponent extends BaseComponent {
  static componentType = '_graphical';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.label = {
      createComponentOfType: 'text',
      createStateVariable: 'label',
      defaultValue: '',
      public: true,
      forRenderer: true,
    };
    attributes.showLabel = {
      createComponentOfType: 'boolean',
      createStateVariable: 'showLabel',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };
    attributes.layer = {
      createComponentOfType: 'number',
      createStateVariable: 'layer',
      defaultValue: 0,
      public: true,
      forRenderer: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.selectedStyle = {
      forRenderer: true,
      willNeverBeEssential: true,
      returnDependencies: () => ({
        styleNumber: {
          dependencyType: 'stateVariable',
          variableName: 'styleNumber',
        },
        ancestorWithStyle: {
          dependencyType: 'ancestor',
          variableNames: ['styleDefinitions'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let styleDefinitions =
          dependencyValues.ancestorWithStyle.stateValues.styleDefinitions;
        if (!styleDefinitions) {
          styleDefinitions = returnDefaultStyleDefinitions();
        }

        let selectedStyle;

        for (let styleDefinition of styleDefinitions) {
          if (dependencyValues.styleNumber === styleDefinition.styleNumber) {
            if (selectedStyle === undefined) {
              selectedStyle = styleDefinition;
            } else {
              // attributes from earlier matches take precedence
              selectedStyle = Object.assign(
                Object.assign({}, styleDefinition),
                selectedStyle,
              );
            }
          }
        }

        if (selectedStyle === undefined) {
          selectedStyle = styleDefinitions[0];
        }
        return { newValues: { selectedStyle } };
      },
    };

    return stateVariableDefinitions;
  }
}
