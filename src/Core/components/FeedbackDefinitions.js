import BaseComponent from './abstract/BaseComponent';

export class FeedbackDefinition extends BaseComponent {
  static componentType = 'feedbackDefinition';

  static get stateVariablesShadowedForReference() {
    return ['value'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.code = {
      createComponentOfType: 'text',
    };
    attributes.text = {
      createComponentOfType: 'text',
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.value = {
      returnDependencies: () => ({
        codeAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'code',
          variableNames: ['value'],
        },
        textAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'text',
          variableNames: ['value'],
        },
      }),
      definition({ dependencyValues }) {
        let value = {};
        if (dependencyValues.codeAttr !== null) {
          value.feedbackCode =
            dependencyValues.codeAttr.stateValues.value.toLowerCase();
        } else {
          value.feedbackCode = '';
        }

        if (dependencyValues.textAttr !== null) {
          value.feedbackText = dependencyValues.textAttr.stateValues.value;
        }

        return {
          newValues: { value },
        };
      },
    };

    return stateVariableDefinitions;
  }
}

export class FeedbackDefinitions extends BaseComponent {
  static componentType = 'feedbackDefinitions';
  static rendererType = undefined;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroFeedbackDefinitions = childLogic.newLeaf({
      name: 'atLeastZeroFeedbackDefinitions',
      componentType: 'feedbackDefinition',
      comparison: 'atLeast',
      number: 0,
    });

    let atMostOneFeedbackDefinitions = childLogic.newLeaf({
      name: 'atMostOneFeedbackDefinitions',
      componentType: 'feedbackDefinitions',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'feedbackDefinitionsXorFeedbackDefinition',
      operator: 'xor',
      propositions: [
        atLeastZeroFeedbackDefinitions,
        atMostOneFeedbackDefinitions,
      ],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nDefinitions = {
      returnDependencies: () => ({
        feedbackDefinitionChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroFeedbackDefinitions',
        },
        feedbackDefinitionsChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFeedbackDefinitions',
          variableNames: ['nDefinitions'],
        },
      }),
      definition({ dependencyValues }) {
        let nDefinitions;
        if (dependencyValues.feedbackDefinitionsChild.length === 1) {
          nDefinitions =
            dependencyValues.feedbackDefinitionsChild[0].stateValues
              .nDefinitions;
        } else {
          nDefinitions = dependencyValues.feedbackDefinitionChildren.length;
        }
        return {
          newValues: { nDefinitions },
        };
      },
    };

    stateVariableDefinitions.value = {
      isArray: true,
      entryPrefixes: ['feedbackDefinition'],
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
            feedbackDefinitionChild: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroFeedbackDefinitions',
              variableNames: ['value'],
              childIndices: [arrayKey],
            },
            feedbackDefinitionsChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneFeedbackDefinitions',
              variableNames: ['feedbackDefinition' + (Number(arrayKey) + 1)],
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let value = {};

        for (let arrayKey of arrayKeys) {
          let feedbackDefinitionChild =
            dependencyValuesByKey[arrayKey].feedbackDefinitionChild;
          if (feedbackDefinitionChild.length === 1) {
            value[arrayKey] = feedbackDefinitionChild[0].stateValues.value;
          } else {
            let feedbackDefinitionsChild =
              dependencyValuesByKey[arrayKey].feedbackDefinitionsChild;
            if (feedbackDefinitionsChild.length === 1) {
              value[arrayKey] =
                feedbackDefinitionsChild[0].stateValues[
                  'feedbackDefinition' + (Number(arrayKey) + 1)
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
