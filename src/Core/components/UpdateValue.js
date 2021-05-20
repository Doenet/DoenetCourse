import { normalizeMathExpression } from '../utils/math';
import InlineComponent from './abstract/InlineComponent';

export class UpdateValue extends InlineComponent {
  static componentType = 'updateValue';

  static acceptTname = true;

  static get stateVariablesShadowedForReference() {
    return ['newValue'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    // attributes.width = {default: 300};
    // attributes.height = {default: 50};
    attributes.label = {
      createComponentOfType: 'text',
      createStateVariable: 'label',
      defaultValue: 'update value',
      public: true,
      forRenderer: true,
    };

    attributes.type = {
      createPrimitiveOfType: 'string',
      defaultValue: 'math',
    };
    attributes.prop = {
      createPrimitiveOfType: 'string',
    };

    attributes.newValue = {
      createComponentOfType: '_componentWithSelectableType',
    };

    attributes.componentIndex = {
      createComponentOfType: 'number',
      createStateVariable: 'componentIndex',
      defaultValue: null,
      public: true,
    };

    attributes.triggerWhen = {
      createComponentOfType: 'boolean',
      createStateVariable: 'triggerWhen',
      defaultValue: false,
      triggerActionOnChange: 'updateValueIfTriggerNewlyTrue',
    };

    attributes.triggerWithTname = {
      createPrimitiveOfType: 'string',
    };

    // for newValue with type==="math"
    // let simplify="" or simplify="true" be full simplify
    attributes.simplify = {
      createComponentOfType: 'text',
      createStateVariable: 'simplify',
      defaultValue: 'none',
      public: true,
      toLowerCase: true,
      valueTransformations: { true: 'full' },
      validValues: ['none', 'full', 'numbers', 'numberspreserveorder'],
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.type = {
      returnDependencies: () => ({
        type: {
          dependencyType: 'attribute',
          attributeName: 'type',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.type) {
          let type = dependencyValues.type.toLowerCase();
          if (['math', 'number', 'boolean', 'text'].includes(type)) {
            return { newValues: { type } };
          } else {
            console.warn(
              `Invalid type ${dependencyValues.type} for an updateValue.  Defaulting to math.`,
            );
          }
        }
        return { newValues: { type: 'math' } };
      },
    };

    stateVariableDefinitions.tName = {
      returnDependencies: () => ({
        tName: {
          dependencyType: 'doenetAttribute',
          attributeName: 'tName',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { tName: dependencyValues.tName },
      }),
    };

    stateVariableDefinitions.targetComponent = {
      returnDependencies() {
        return {
          targetComponent: {
            dependencyType: 'targetComponent',
          },
        };
      },
      definition: function ({ dependencyValues }) {
        let targetComponent = null;
        if (dependencyValues.targetComponent) {
          targetComponent = dependencyValues.targetComponent;
        }

        return {
          newValues: { targetComponent },
        };
      },
    };

    stateVariableDefinitions.propName = {
      returnDependencies: () => ({
        propName: {
          dependencyType: 'attribute',
          attributeName: 'prop',
        },
      }),
      definition: function ({ dependencyValues }) {
        return { newValues: { propName: dependencyValues.propName } };
      },
    };

    stateVariableDefinitions.targetIdentities = {
      stateVariablesDeterminingDependencies: [
        'targetComponent',
        'componentIndex',
      ],
      returnDependencies: function ({ stateValues, componentInfoObjects }) {
        let dependencies = {};

        if (stateValues.targetComponent !== null) {
          if (
            componentInfoObjects.isCompositeComponent({
              componentType: stateValues.targetComponent.componentType,
              includeNonStandard: false,
            })
          ) {
            dependencies.targets = {
              dependencyType: 'replacement',
              compositeName: stateValues.targetComponent.componentName,
              recursive: true,
              componentIndex: stateValues.componentIndex,
            };
          } else if (
            stateValues.componentIndex === null ||
            stateValues.componentIndex === 1
          ) {
            // if we don't have a composite, componentIndex can only match if it is 1
            dependencies.targets = {
              dependencyType: 'stateVariable',
              variableName: 'targetComponent',
            };
          }
        }
        return dependencies;
      },
      definition({ dependencyValues }) {
        let targetIdentities = null;
        if (dependencyValues.targets) {
          targetIdentities = dependencyValues.targets;
          if (!Array.isArray(targetIdentities)) {
            targetIdentities = [targetIdentities];
          }
        }
        return { newValues: { targetIdentities } };
      },
    };

    stateVariableDefinitions.targets = {
      stateVariablesDeterminingDependencies: ['targetIdentities', 'propName'],
      returnDependencies: function ({ stateValues }) {
        let dependencies = {
          targetIdentities: {
            dependencyType: 'stateVariable',
            variableName: 'targetIdentities',
          },
        };

        if (stateValues.targetIdentities !== null) {
          for (let [ind, source] of stateValues.targetIdentities.entries()) {
            let thisTarget;

            if (stateValues.propName) {
              thisTarget = {
                dependencyType: 'stateVariable',
                componentName: source.componentName,
                variableName: stateValues.propName,
                returnAsComponentObject: true,
                variablesOptional: true,
                propIndex: stateValues.propIndex,
                caseInsensitiveVariableMatch: true,
                publicStateVariablesOnly: true,
                useMappedVariableNames: true,
              };
            } else {
              thisTarget = {
                dependencyType: 'componentIdentity',
                componentName: source.componentName,
              };
            }

            dependencies['target' + ind] = thisTarget;
          }
        }

        return dependencies;
      },
      definition({ dependencyValues }) {
        let targets = null;

        if (dependencyValues.targetIdentities !== null) {
          targets = [];

          for (let ind in dependencyValues.targetIdentities) {
            if (dependencyValues['target' + ind]) {
              targets.push(dependencyValues['target' + ind]);
            }
          }
        }

        return { newValues: { targets } };
      },
    };

    stateVariableDefinitions.newValue = {
      returnDependencies: () => ({
        newValueAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'newValue',
          variableNames: ['value'],
        },
        type: {
          dependencyType: 'stateVariable',
          variableName: 'type',
        },
        simplify: {
          dependencyType: 'stateVariable',
          variableName: 'simplify',
        },
      }),
      defaultValue: null,
      definition: function ({ dependencyValues }) {
        if (dependencyValues.newValueAttr === null) {
          return {
            newValues: {
              newValue: null,
            },
          };
        }

        let newValue = dependencyValues.newValueAttr.stateValues.value;

        if (dependencyValues.type === 'math') {
          newValue = normalizeMathExpression({
            value: newValue,
            simplify: dependencyValues.simplify,
          });
        }

        return {
          newValues: { newValue },
        };
      },
    };

    stateVariableDefinitions.insideUpdateValueSet = {
      returnDependencies: () => ({
        parentUpdateValueSet: {
          dependencyType: 'parentStateVariable',
          parentComponentType: 'updateValueSet',
          variableName: 'updateValuesToTrigger',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            insideUpdateValueSet:
              dependencyValues.parentUpdateValueSet !== null,
          },
        };
      },
    };

    stateVariableDefinitions.triggerWithTname = {
      returnDependencies: () => ({
        triggerWithTname: {
          dependencyType: 'attribute',
          attributeName: 'triggerWithTname',
        },
        triggerWhen: {
          dependencyType: 'attribute',
          attributeName: 'triggerWhen',
        },
        insideUpdateValueSet: {
          dependencyType: 'stateVariable',
          variableName: 'insideUpdateValueSet',
        },
      }),
      definition({ dependencyValues }) {
        if (
          dependencyValues.triggerWhen ||
          dependencyValues.insideUpdateValueSet
        ) {
          return { newValues: { triggerWithTname: null } };
        } else {
          return {
            newValues: { triggerWithTname: dependencyValues.triggerWithTname },
          };
        }
      },
    };

    stateVariableDefinitions.triggerWithFullTname = {
      chainActionOnActionOfStateVariableTarget: {
        triggeringAction: 'updateValue',
        triggeredAction: 'updateValue',
      },
      stateVariablesDeterminingDependencies: ['triggerWithTname'],
      returnDependencies({ stateValues }) {
        if (stateValues.triggerWithTname) {
          return {
            triggerWithFullTname: {
              dependencyType: 'expandTargetName',
              tName: stateValues.triggerWithTname,
            },
          };
        } else {
          return {};
        }
      },
      definition({ dependencyValues }) {
        return {
          newValues: {
            triggerWithFullTname: dependencyValues.triggerWithFullTname,
          },
        };
      },
    };

    let originalHiddenReturnDependencies =
      stateVariableDefinitions.hidden.returnDependencies;
    let originalHiddenDefinition = stateVariableDefinitions.hidden.definition;

    stateVariableDefinitions.hidden.returnDependencies = function (args) {
      let dependencies = originalHiddenReturnDependencies(args);
      dependencies.triggerWhen = {
        dependencyType: 'attributeComponent',
        attributeName: 'triggerWhen',
      };
      dependencies.triggerWithTname = {
        dependencyType: 'stateVariable',
        variableName: 'triggerWithTname',
      };
      dependencies.insideUpdateValueSet = {
        dependencyType: 'stateVariable',
        variableName: 'insideUpdateValueSet',
      };
      return dependencies;
    };

    stateVariableDefinitions.hidden.definition = function (args) {
      if (
        args.dependencyValues.triggerWhen ||
        args.dependencyValues.triggerWithTname ||
        args.dependencyValues.insideUpdateValueSet
      ) {
        return { newValues: { hidden: true } };
      } else {
        return originalHiddenDefinition(args);
      }
    };

    return stateVariableDefinitions;
  }

  updateValue() {
    if (
      this.stateValues.targets !== null &&
      this.stateValues.newValue !== null
    ) {
      let updateInstructions = [];

      for (let target of this.stateValues.targets) {
        let stateVariable = 'value';
        if (target.stateValues) {
          stateVariable = Object.keys(target.stateValues)[0];
          if (stateVariable === undefined) {
            console.warn(
              `Cannot update prop="${this.stateValues.propName}" of ${this.stateValues.tName} as could not find prop ${this.stateValues.propName} on a component of type ${target.componentType}`,
            );
            continue;
          }
        }

        updateInstructions.push({
          updateType: 'updateValue',
          componentName: target.componentName,
          stateVariable,
          value: this.stateValues.newValue,
        });
      }

      if (updateInstructions.length > 0) {
        this.coreFunctions.requestUpdate({
          updateInstructions,
          event: {
            verb: 'selected',
            object: {
              componentName: this.componentName,
              componentType: this.componentType,
            },
            result: {
              response: this.stateValues.newValue,
              responseText: this.stateValues.newValue.toString(),
            },
          },
          callBack: () =>
            this.coreFunctions.triggerChainedActions({
              componentName: this.componentName,
              actionName: 'updateValue',
            }),
        });
      }
    }
  }

  updateValueIfTriggerNewlyTrue({ stateValues, previousValues }) {
    if (
      stateValues.triggerWhen &&
      !previousValues.triggerWhen &&
      !this.stateValues.insideUpdateValueSet
    ) {
      this.updateValue();
    }
  }

  actions = {
    updateValue: this.updateValue.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
    updateValueIfTriggerNewlyTrue: this.updateValueIfTriggerNewlyTrue.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
  };
}

export class UpdateValueSet extends InlineComponent {
  static componentType = 'updateValueSet';
  static rendererType = 'updateValue';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    // attributes.width = {default: 300};
    // attributes.height = {default: 50};
    attributes.label = {
      createComponentOfType: 'text',
      createStateVariable: 'label',
      defaultValue: 'update value',
      public: true,
      forRenderer: true,
    };

    attributes.triggerWhen = {
      createComponentOfType: 'boolean',
      createStateVariable: 'triggerWhen',
      defaultValue: false,
      triggerActionOnChange: 'updateValueIfTriggerNewlyTrue',
    };

    attributes.triggerWithTname = {
      createPrimitiveOfType: 'string',
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroUpdateValues',
      componentType: 'updateValue',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.updateValuesToTrigger = {
      returnDependencies: () => ({
        updateValueChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroUpdateValues',
          variableNames: ['targets', 'newValue', 'propName', 'tName'],
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            updateValuesToTrigger: dependencyValues.updateValueChildren,
          },
        };
      },
    };

    stateVariableDefinitions.triggerWithTname = {
      returnDependencies: () => ({
        triggerWithTname: {
          dependencyType: 'attribute',
          attributeName: 'triggerWithTname',
        },
        triggerWhen: {
          dependencyType: 'attribute',
          attributeName: 'triggerWhen',
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.triggerWhen) {
          return { newValues: { triggerWithTname: null } };
        } else {
          return {
            newValues: { triggerWithTname: dependencyValues.triggerWithTname },
          };
        }
      },
    };

    stateVariableDefinitions.triggerWithFullTname = {
      chainActionOnActionOfStateVariableTarget: {
        triggeringAction: 'updateValue',
        triggeredAction: 'updateValue',
      },
      stateVariablesDeterminingDependencies: ['triggerWithTname'],
      returnDependencies({ stateValues }) {
        if (stateValues.triggerWithTname) {
          return {
            triggerWithFullTname: {
              dependencyType: 'expandTargetName',
              tName: stateValues.triggerWithTname,
            },
          };
        } else {
          return {};
        }
      },
      definition({ dependencyValues }) {
        return {
          newValues: {
            triggerWithFullTname: dependencyValues.triggerWithFullTname,
          },
        };
      },
    };

    let originalHiddenReturnDependencies =
      stateVariableDefinitions.hidden.returnDependencies;
    let originalHiddenDefinition = stateVariableDefinitions.hidden.definition;

    stateVariableDefinitions.hidden.returnDependencies = function (args) {
      let dependencies = originalHiddenReturnDependencies(args);
      (dependencies.triggerWhen = {
        dependencyType: 'attributeComponent',
        attributeName: 'triggerWhen',
      }),
        (dependencies.triggerWithTname = {
          dependencyType: 'stateVariable',
          variableName: 'triggerWithTname',
        });
      return dependencies;
    };

    stateVariableDefinitions.hidden.definition = function (args) {
      if (
        args.dependencyValues.triggerWhen ||
        args.dependencyValues.triggerWithTname
      ) {
        return { newValues: { hidden: true } };
      } else {
        return originalHiddenDefinition(args);
      }
    };

    return stateVariableDefinitions;
  }

  updateValue() {
    let updateInstructions = [];

    for (let updateValueChild of this.stateValues.updateValuesToTrigger) {
      if (
        updateValueChild.stateValues.targets !== null &&
        updateValueChild.stateValues.newValue !== null
      ) {
        for (let target of updateValueChild.stateValues.targets) {
          let stateVariable = 'value';
          if (target.stateValues) {
            stateVariable = Object.keys(target.stateValues)[0];
            if (stateVariable === undefined) {
              console.warn(
                `Cannot update prop="${updateValueChild.stateValues.propName}" of ${updateValueChild.stateValues.tName} as could not find prop ${updateValueChild.stateValues.propName} on a component of type ${target.componentType}`,
              );
              continue;
            }
          }

          updateInstructions.push({
            updateType: 'updateValue',
            componentName: target.componentName,
            stateVariable,
            value: updateValueChild.stateValues.newValue,
          });
        }
      }
    }

    if (updateInstructions.length > 0) {
      let allUpdateValueNames = [
        this.componentName,
        ...this.stateValues.updateValuesToTrigger.map((x) => x.componentName),
      ];

      this.coreFunctions.requestUpdate({
        updateInstructions,
        event: {
          verb: 'selected',
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          result: {
            response: this.stateValues.updateValuesToTrigger.map(
              (x) => x.stateValues.newValue,
            ),
            responseText: this.stateValues.updateValuesToTrigger.map((x) =>
              x.stateValues.newValue.toString(),
            ),
          },
        },
        callBack: () => {
          for (let cName of allUpdateValueNames) {
            this.coreFunctions.triggerChainedActions({
              componentName: cName,
              actionName: 'updateValue',
            });
          }
        },
      });
    }
  }

  updateValueIfTriggerNewlyTrue({ stateValues, previousValues }) {
    if (stateValues.triggerWhen && !previousValues.triggerWhen) {
      this.updateValue();
    }
  }

  actions = {
    updateValue: this.updateValue.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
    updateValueIfTriggerNewlyTrue: this.updateValueIfTriggerNewlyTrue.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
  };
}
