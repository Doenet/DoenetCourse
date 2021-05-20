import BaseComponent from './abstract/BaseComponent';
import {
  returnSequenceValues,
  returnStandardSequenceAttributes,
  returnStandardSequenceStateVariableDefinitions,
  returnStandardSequenceStateVariablesShadowedForReference,
} from '../utils/sequence';
import me from 'math-expressions';

export default class AnimateFromSequence extends BaseComponent {
  constructor(args) {
    super(args);
    this.advanceAnimation = this.advanceAnimation.bind(this);
  }
  static componentType = 'animateFromSequence';
  static rendererType = undefined;

  static acceptTname = true;

  static get stateVariablesShadowedForReference() {
    return returnStandardSequenceStateVariablesShadowedForReference();
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    let sequenceAttributes = returnStandardSequenceAttributes();
    Object.assign(attributes, sequenceAttributes);

    attributes.prop = {
      createPrimitiveOfType: 'string',
    };

    attributes.componentIndex = {
      createComponentOfType: 'number',
      createStateVariable: 'componentIndex',
      defaultValue: null,
      public: true,
    };

    attributes.animationOn = {
      createComponentOfType: 'boolean',
      createStateVariable: 'animationOn',
      defaultValue: false,
      public: true,
      triggerActionOnChange: 'startStopAnimation',
    };

    attributes.animationMode = {
      createComponentOfType: 'text',
      createStateVariable: 'animationMode',
      defaultValue: 'increase',
      validValues: [
        'increase',
        'decrease',
        'increase once',
        'decrease once',
        'oscillate',
      ],
      toLowerCase: true,
      public: true,
    };

    attributes.animationInterval = {
      createComponentOfType: 'number',
      createStateVariable: 'animationInterval',
      defaultValue: 1000,
      public: true,
    };

    attributes.initialSelectedIndex = {
      createComponentOfType: 'number',
      createStateVariable: 'initialSelectedIndex',
      defaultValue: 1,
      public: true,
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    let sequenceDefs = returnStandardSequenceStateVariableDefinitions();
    Object.assign(stateVariableDefinitions, sequenceDefs);

    stateVariableDefinitions.possibleValues = {
      additionalStateVariablesDefined: ['numberValues'],
      returnDependencies: () => ({
        type: {
          dependencyType: 'stateVariable',
          variableName: 'type',
        },
        length: {
          dependencyType: 'stateVariable',
          variableName: 'length',
        },
        from: {
          dependencyType: 'stateVariable',
          variableName: 'from',
        },
        step: {
          dependencyType: 'stateVariable',
          variableName: 'step',
        },
        exclude: {
          dependencyType: 'stateVariable',
          variableName: 'exclude',
        },
        lowercase: {
          dependencyType: 'stateVariable',
          variableName: 'lowercase',
        },
      }),
      definition({ dependencyValues }) {
        let possibleValues = returnSequenceValues(dependencyValues);

        return {
          newValues: {
            possibleValues,
            numberValues: possibleValues.length,
          },
        };
      },
    };

    stateVariableDefinitions.selectedIndex = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        numberValues: {
          dependencyType: 'stateVariable',
          variableName: 'numberValues',
        },
        initialSelectedIndex: {
          dependencyType: 'stateVariable',
          variableName: 'initialSelectedIndex',
        },
      }),
      definition({ dependencyValues }) {
        return {
          useEssentialOrDefaultValue: {
            selectedIndex: {
              variablesToCheck: ['selectedIndex'],
              get defaultValue() {
                return Math.min(
                  dependencyValues.numberValues,
                  Math.max(1, dependencyValues.initialSelectedIndex),
                );
              },
            },
          },
        };
      },
      inverseDefinition({ desiredStateVariableValues, dependencyValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'selectedIndex',
              value:
                me.math.mod(
                  desiredStateVariableValues.selectedIndex - 1,
                  dependencyValues.numberValues,
                ) + 1,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.value = {
      public: true,
      hasVariableComponentType: true,
      returnDependencies: () => ({
        possibleValues: {
          dependencyType: 'stateVariable',
          variableName: 'possibleValues',
        },
        selectedIndex: {
          dependencyType: 'stateVariable',
          variableName: 'selectedIndex',
        },
        type: {
          dependencyType: 'stateVariable',
          variableName: 'type',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            value:
              dependencyValues.possibleValues[
                dependencyValues.selectedIndex - 1
              ],
          },
          setComponentType: { value: dependencyValues.type },
        };
      },
      inverseDefinition({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
      }) {
        // if number, can find closest value
        if (dependencyValues.type === 'number') {
          let desiredValue = desiredStateVariableValues.value;
          if (desiredValue instanceof me.class) {
            desiredValue = desiredValue.evaluate_to_constant();
          }
          if (!Number.isFinite(desiredValue)) {
            return { success: false };
          }

          // use binary search
          // find largest index where possibleValue is
          // larger (or smaller if step is negative) than desiredValue
          let start = -1,
            end = dependencyValues.possibleValues.length - 1;
          while (start < end - 1) {
            let mid = Math.floor((start + end) / 2); // mid point
            if (
              stateValues.step *
                (dependencyValues.possibleValues[mid] - desiredValue) >
              0
            ) {
              end = mid;
            } else {
              start = mid;
            }
          }
          let closestInd = end;
          if (start !== -1) {
            if (
              Math.abs(desiredValue - dependencyValues.possibleValues[start]) <
              Math.abs(desiredValue - dependencyValues.possibleValues[end])
            ) {
              closestInd = start;
            }
          }
          return {
            success: true,
            instructions: [
              {
                setDependency: 'selectedIndex',
                desiredValue: closestInd + 1,
              },
            ],
          };
        } else {
          // if not number, just try to find in sequence
          let desiredValue = stateVariablesToUpdate.value;
          let index = dependencyValues.possibleValues.indexOf(desiredValue);
          if (index === -1) {
            return { success: false };
          } else {
            return {
              success: true,
              instructions: [
                {
                  setDependency: 'selectedIndex',
                  desiredValue: index + 1,
                },
              ],
            };
          }
        }
      },
    };

    stateVariableDefinitions.currentAnimationDirection = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        animationMode: {
          dependencyType: 'stateVariable',
          variableName: 'animationMode',
        },
      }),
      definition({ dependencyValues }) {
        return {
          useEssentialOrDefaultValue: {
            currentAnimationDirection: {
              variablesToCheck: ['currentAnimationDirection'],
              get defaultValue() {
                if (
                  dependencyValues.animationMode.substring(0, 8) === 'decrease'
                ) {
                  return 'decrease';
                } else {
                  return 'increase';
                }
              },
            },
          },
        };
      },
      inverseDefinition({ desiredStateVariableValues }) {
        let newDirection =
          desiredStateVariableValues.currentAnimationDirection.toLowerCase();
        if (!['increase', 'decrease'].includes(newDirection)) {
          newDirection = 'increase';
        }
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'currentAnimationDirection',
              value: newDirection,
            },
          ],
        };
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

    return stateVariableDefinitions;
  }

  startStopAnimation({ stateValues, previousValues }) {
    let updateInstructions = [];

    if (stateValues.animationOn) {
      if (!previousValues.animationOn) {
        let newDirection = this.stateValues.currentAnimationDirection;
        let startIndex = this.stateValues.selectedIndex;
        if (this.stateValues.currentAnimationDirection === 'increase') {
          if (
            this.stateValues.selectedIndex === this.stateValues.numberValues
          ) {
            // started animation in increasing direction
            // but are at largest value
            if (this.stateValues.animationMode === 'increase once') {
              // if won't reset automatically,
              // manually reset to beginning before starting
              startIndex = 1;
              updateInstructions.push({
                updateType: 'updateValue',
                componentName: this.componentName,
                stateVariable: 'selectedIndex',
                value: startIndex,
              });
            } else if (this.stateValues.animationMode === 'oscillate') {
              // change direction if oscillating
              newDirection = 'decrease';
              updateInstructions.push({
                updateType: 'updateValue',
                componentName: this.componentName,
                stateVariable: 'currentAnimationDirection',
                value: newDirection,
              });
            }
          }
        } else if (this.stateValues.currentAnimationDirection === 'decrease') {
          if (this.stateValues.selectedIndex === 1) {
            // started animation in decreasing direction
            // but are at smallest value
            if (this.stateValues.animationMode === 'decrease once') {
              // if won't reset automatically,
              // manually reset to end before starting
              startIndex = this.stateValues.numberValues;
              updateInstructions.push({
                updateType: 'updateValue',
                componentName: this.componentName,
                stateVariable: 'selectedIndex',
                value: startIndex,
              });
            } else if (this.stateValues.animationMode === 'oscillate') {
              // change direction if oscillating
              newDirection = 'increase';
              updateInstructions.push({
                updateType: 'updateValue',
                componentName: this.componentName,
                stateVariable: 'currentAnimationDirection',
                value: newDirection,
              });
            }
          }
        }

        let additionalInstructions =
          this.getUpdateInstructionsToSetTargetsToValue(
            this.stateValues.possibleValues[
              me.math.mod(startIndex - 1, this.stateValues.numberValues)
            ],
          );
        updateInstructions.push(...additionalInstructions);

        this.coreFunctions.requestUpdate({
          updateInstructions,
          event: {
            verb: 'played',
            object: {
              componentName: this.componentName,
              componentType: this.componentType,
            },
            context: {
              startIndex,
              animationDirection: newDirection,
              animationMode: this.stateValues.animationMode,
            },
          },
        });

        this.animationID = this.coreFunctions.requestAnimationFrame(
          this.advanceAnimation,
          this.stateValues.animationInterval,
        );
      }
    } else {
      if (previousValues.animationOn) {
        // cancel any animation in progress
        this.coreFunctions.cancelAnimationFrame(this.animationID);
        this.coreFunctions.requestRecordEvent({
          verb: 'paused',
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          context: {
            endIndex: this.stateValues.selectedIndex,
          },
        });
      }
    }
  }

  actions = {
    startStopAnimation: this.startStopAnimation.bind(this),
  };

  advanceAnimation() {
    let newSelectedIndex;
    let continueAnimation = true;
    let newDirection;
    if (this.stateValues.currentAnimationDirection === 'decrease') {
      newSelectedIndex = this.stateValues.selectedIndex - 1;
      if (newSelectedIndex <= 1) {
        if (this.stateValues.animationMode === 'decrease once') {
          continueAnimation = false;
        } else if (this.stateValues.animationMode === 'oscillate') {
          newDirection = 'increase';
        }
      }
    } else {
      newSelectedIndex = this.stateValues.selectedIndex + 1;
      if (newSelectedIndex >= this.stateValues.numberValues) {
        if (this.stateValues.animationMode === 'increase once') {
          continueAnimation = false;
        } else if (this.stateValues.animationMode === 'oscillate') {
          newDirection = 'decrease';
        }
      }
    }

    let updateInstructions = [
      {
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'selectedIndex',
        value: newSelectedIndex,
      },
    ];

    let additionalInstructions = this.getUpdateInstructionsToSetTargetsToValue(
      this.stateValues.possibleValues[
        me.math.mod(newSelectedIndex - 1, this.stateValues.numberValues)
      ],
    );
    updateInstructions.push(...additionalInstructions);

    if (!continueAnimation) {
      updateInstructions.push({
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'animationOn',
        value: false,
      });
    }
    if (newDirection) {
      updateInstructions.push({
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'currentAnimationDirection',
        value: newDirection,
      });
    }

    this.coreFunctions.requestUpdate({
      updateInstructions,
    });

    if (continueAnimation) {
      this.animationID = this.coreFunctions.requestAnimationFrame(
        this.advanceAnimation,
        this.stateValues.animationInterval,
      );
    }
  }

  getUpdateInstructionsToSetTargetsToValue(value) {
    if (this.stateValues.targets == null) {
      return [];
    }

    let updateInstructions = [];

    for (let target of this.stateValues.targets) {
      let stateVariable = 'value';
      if (target.stateValues) {
        stateVariable = Object.keys(target.stateValues)[0];
        if (stateVariable === undefined) {
          console.warn(
            `Cannot animate prop="${this.stateValues.propName}" of ${this.stateValues.tName} as could not find prop ${this.stateValues.propName} on a component of type ${target.componentType}`,
          );
          continue;
        }
      }

      updateInstructions.push({
        updateType: 'updateValue',
        componentName: target.componentName,
        stateVariable,
        value,
      });
    }

    return updateInstructions;
  }
}
