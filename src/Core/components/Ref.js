import InlineComponent from './abstract/InlineComponent';

export default class Ref extends InlineComponent {
  static componentType = 'ref';
  static renderChildren = true;

  static acceptTname = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.textType = {
      createComponentOfType: 'text',
      createStateVariable: 'textType',
      defaultValue: 'type-global',
      public: true,
    };
    attributes.uri = {
      createComponentOfType: '_textFromSingleStringChild',
      createStateVariable: 'uri',
      defaultValue: null,
      public: true,
      forRenderer: true,
    };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    // for the link text
    childLogic.newLeaf({
      name: 'atLeastZeroAnything',
      componentType: '_base',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.targetComponent = {
      returnDependencies: () => ({
        targetComponent: {
          dependencyType: 'targetComponent',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            targetComponent: dependencyValues.targetComponent,
          },
        };
      },
    };

    stateVariableDefinitions.targetInactive = {
      stateVariablesDeterminingDependencies: ['targetComponent'],
      returnDependencies({ stateValues }) {
        if (stateValues.targetComponent) {
          return {
            targetIsInactiveCompositeReplacement: {
              dependencyType: 'stateVariable',
              componentName: stateValues.targetComponent.componentName,
              variableName: 'isInactiveCompositeReplacement',
            },
          };
        } else {
          return {};
        }
      },
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            targetInactive: Boolean(
              dependencyValues.targetIsInactiveCompositeReplacement,
            ),
          },
        };
      },
    };

    stateVariableDefinitions.targetName = {
      forRenderer: true,
      returnDependencies: () => ({
        targetComponent: {
          dependencyType: 'stateVariable',
          variableName: 'targetComponent',
        },
        uri: {
          dependencyType: 'stateVariable',
          variableName: 'uri',
        },
        targetInactive: {
          dependencyType: 'stateVariable',
          variableName: 'targetInactive',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (
          dependencyValues.targetComponent === null ||
          dependencyValues.targetInactive
        ) {
          return { newValues: { targetName: '' } };
        } else {
          if (dependencyValues.uri !== null) {
            console.warn(
              "Haven't implemented ref with uri and tname, ignoring tname.",
            );
            return { newValues: { targetName: '' } };
          }
          return {
            newValues: {
              targetName: dependencyValues.targetComponent.componentName,
            },
          };
        }
      },
    };

    stateVariableDefinitions.contentId = {
      returnDependencies: () => ({
        uri: {
          dependencyType: 'stateVariable',
          variableName: 'uri',
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.uri !== null) {
          let result = dependencyValues.uri.match(
            /^\s*doenet\s*:\s*(\S*)\s*$/i,
          );

          if (result !== null) {
            return {
              newValues: {
                contentId: result[1],
              },
            };
          }
        }

        return { newValues: { contentId: null } };
      },
    };

    stateVariableDefinitions.linkText = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      stateVariablesDeterminingDependencies: ['targetName'],
      returnDependencies({ stateValues }) {
        let dependencies = {
          inlineChildren: {
            dependencyType: 'child',
            childLogicName: 'atLeastZeroAnything',
            variableNames: ['text'],
            variablesOptional: true,
          },
          uri: {
            dependencyType: 'stateVariable',
            variableName: 'uri',
          },
          targetInactive: {
            dependencyType: 'stateVariable',
            variableName: 'targetInactive',
          },
        };

        if (stateValues.targetName) {
          dependencies.equationTag = {
            dependencyType: 'stateVariable',
            componentName: stateValues.targetName,
            variableName: 'equationTag',
            variablesOptional: true,
          };
          dependencies.title = {
            dependencyType: 'stateVariable',
            componentName: stateValues.targetName,
            variableName: 'title',
            variablesOptional: true,
          };
        }

        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        let linkText = '';
        if (dependencyValues.inlineChildren.length === 0) {
          if (dependencyValues.uri !== null) {
            linkText = dependencyValues.uri;
          } else if (!dependencyValues.targetInactive) {
            if (dependencyValues.title !== null) {
              linkText = dependencyValues.title;
            } else if (dependencyValues.equationTag !== null) {
              linkText = '(' + dependencyValues.equationTag + ')';
            }
          }
        } else {
          for (let child of dependencyValues.inlineChildren) {
            if (typeof child.stateValues.text === 'string') {
              linkText += child.stateValues.text;
            }
          }
        }

        if (!linkText) {
          linkText = '???';
        }
        return { newValues: { linkText } };
      },
    };

    return stateVariableDefinitions;
  }
}
