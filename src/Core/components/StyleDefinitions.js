import BaseComponent from './abstract/BaseComponent';

let styleAttributes = {
  lineColor: { componentType: 'text' },
  lineWidth: { componentType: 'number' },
  lineStyle: { componentType: 'text' },
  markerColor: { componentType: 'text' },
  markerStyle: { componentType: 'text' },
  markerSize: { componentType: 'number' },
};

export class StyleDefinition extends BaseComponent {
  static componentType = 'styleDefinition';
  static rendererType = undefined;

  static get stateVariablesShadowedForReference() {
    return ['value'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.styleNumber = {
      createPrimitiveOfType: 'number',
    };

    for (let styleAttr in styleAttributes) {
      attributes[styleAttr] = {
        createComponentOfType: styleAttributes[styleAttr].componentType,
        // copyComponentOnReference: true
      };
    }

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.value = {
      returnDependencies: function () {
        let dependencies = {
          styleNumber: {
            dependencyType: 'attribute',
            attributeName: 'styleNumber',
          },
        };

        for (let styleAttr in styleAttributes) {
          dependencies[styleAttr] = {
            dependencyType: 'attributeComponent',
            attributeName: styleAttr,
            variableNames: ['value'],
          };
        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        let value = {
          styleNumber: dependencyValues.styleNumber,
        };

        for (let styleAttr in styleAttributes) {
          if (dependencyValues[styleAttr] !== null) {
            value[styleAttr] = dependencyValues[styleAttr].stateValues.value;
          }
        }

        return { newValues: { value } };
      },
    };

    return stateVariableDefinitions;
  }
}

export class StyleDefinitions extends BaseComponent {
  static componentType = 'styleDefinitions';
  static rendererType = undefined;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroStyleDefinitions = childLogic.newLeaf({
      name: 'atLeastZeroStyleDefinitions',
      componentType: 'styleDefinition',
      comparison: 'atLeast',
      number: 0,
    });

    let atMostOneStyleDefinitions = childLogic.newLeaf({
      name: 'atMostOneStyleDefinitions',
      componentType: 'styleDefinitions',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'styleDefinitionsXorStyleDefinition',
      operator: 'xor',
      propositions: [atLeastZeroStyleDefinitions, atMostOneStyleDefinitions],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nDefinitions = {
      returnDependencies: () => ({
        styleDefinitionChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroStyleDefinitions',
        },
        styleDefinitionsChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneStyleDefinitions',
          variableNames: ['nDefinitions'],
        },
      }),
      definition({ dependencyValues }) {
        let nDefinitions;
        if (dependencyValues.styleDefinitionsChild.length === 1) {
          nDefinitions =
            dependencyValues.styleDefinitionsChild[0].stateValues.nDefinitions;
        } else {
          nDefinitions = dependencyValues.styleDefinitionChildren.length;
        }
        return {
          newValues: { nDefinitions },
        };
      },
    };

    stateVariableDefinitions.value = {
      isArray: true,
      entryPrefixes: ['styleDefinition'],
      returnArraySizeDependencies: () => ({
        nDefinitions: {
          dependencyType: 'stateVariable',
          variableName: 'nDefinitions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDefinitions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            styleDefinitionChild: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroStyleDefinitions',
              variableNames: ['value'],
              childIndices: [arrayKey],
            },
            styleDefinitionsChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneStyleDefinitions',
              variableNames: ['styleDefinition' + (Number(arrayKey) + 1)],
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let value = {};

        for (let arrayKey of arrayKeys) {
          let styleDefinitionChild =
            dependencyValuesByKey[arrayKey].styleDefinitionChild;
          if (styleDefinitionChild.length === 1) {
            value[arrayKey] = styleDefinitionChild[0].stateValues.value;
          } else {
            let styleDefinitionsChild =
              dependencyValuesByKey[arrayKey].styleDefinitionsChild;
            if (styleDefinitionsChild.length === 1) {
              value[arrayKey] =
                styleDefinitionsChild[0].stateValues[
                  'styleDefinition' + (Number(arrayKey) + 1)
                ];
            }
          }
        }

        return { newValues: { value } };
      },
    };

    return stateVariableDefinitions;
  }
}
