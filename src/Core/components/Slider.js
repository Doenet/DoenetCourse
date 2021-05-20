import BaseComponent from './abstract/BaseComponent';

export default class Slider extends BaseComponent {
  constructor(args) {
    super(args);
    this.changeValue = this.changeValue.bind(this);

    this.actions = {
      changeValue: this.changeValue,
    };
  }
  static componentType = 'slider';

  static variableForPlainMacro = 'value';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.width = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'width',
      defaultValue: { size: 300, isAbsolute: true },
      public: true,
      forRenderer: true,
    };
    attributes.height = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'height',
      defaultValue: { size: 100, isAbsolute: true },
      public: true,
      forRenderer: true,
    };
    attributes.initialNumber = {
      createComponentOfType: 'number',
      createStateVariable: 'initialNumber',
      defaultValue: undefined,
      public: true,
    };
    attributes.initialText = {
      createComponentOfType: 'text',
      createStateVariable: 'initialText',
      defaultValue: undefined,
      public: true,
    };
    attributes.label = {
      createComponentOfType: 'text',
      createStateVariable: 'label',
      defaultValue: undefined,
      public: true,
      forRenderer: true,
    };
    attributes.showControls = {
      createComponentOfType: 'boolean',
      createStateVariable: 'showControls',
      defaultValue: false,
      public: true,
      forRenderer: true,
    };
    attributes.showTicks = {
      createComponentOfType: 'boolean',
      createStateVariable: 'showTicks',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroNumbers = childLogic.newLeaf({
      name: 'atLeastZeroNumbers',
      componentType: 'number',
      comparison: 'atLeast',
      number: 0,
    });
    let atLeastOneTexts = childLogic.newLeaf({
      name: 'atLeastOneTexts',
      componentType: 'text',
      comparison: 'atLeast',
      number: 1,
    });

    // let exactlyOneSequence = childLogic.newLeaf({
    //   name: "exactlyOneSequence",
    //   componentType: 'sequence',
    //   number: 1,
    // });

    let numbersXorTextsXorSequence = childLogic.newOperator({
      name: 'numbersXorTextsXorSequence',
      operator: 'xor',
      propositions: [
        atLeastOneTexts,
        atLeastZeroNumbers /*exactlyOneSequence*/,
      ],
    });

    let atMostOneMarkers = childLogic.newLeaf({
      name: 'atMostOneMarkers',
      componentType: 'markers',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'SliderLogic',
      operator: 'and',
      propositions: [numbersXorTextsXorSequence, atMostOneMarkers],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.sliderType = {
      forRenderer: true,
      returnDependencies: () => ({
        textChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneTexts',
        },
        numberChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroNumbers',
        },
      }),
      definition: function ({ dependencyValues }) {
        let sliderType;
        if (dependencyValues.textChildren.length > 0) {
          sliderType = 'text';
        } else {
          sliderType = 'number';
        }
        return { newValues: { sliderType } };
      },
    };

    stateVariableDefinitions.items = {
      forRenderer: true,
      public: true,
      hasVariableComponentType: true,
      // isArray: true,
      // entryPrefixes: ["item"],
      // entireArrayAtOnce: true,
      returnDependencies: () => ({
        textChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneTexts',
          variableNames: ['value'],
        },
        numberChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroNumbers',
          variableNames: ['value'],
        },
        sliderType: {
          dependencyType: 'stateVariable',
          variableName: 'sliderType',
        },
      }),
      definition: function ({ dependencyValues }) {
        let items;

        if (dependencyValues.sliderType === 'text') {
          items = dependencyValues.textChildren.map((x) => x.stateValues.value);
        } else if (dependencyValues.numberChildren.length > 0) {
          items = dependencyValues.numberChildren.map(
            (x) => x.stateValues.value,
          );
          items.sort((a, b) => {
            return a - b;
          }); //sort in number order
        } else {
          // if no children, make items be integers from 0 to 10
          items = [...Array(11).keys()];
        }

        return {
          newValues: { items },
          setComponentType: { items: dependencyValues.sliderType },
        };
      },
    };

    stateVariableDefinitions.valueToIndex = {
      forRenderer: true,
      returnDependencies: () => ({
        items: {
          dependencyType: 'stateVariable',
          variableName: 'items',
        },
      }),
      definition: function ({ dependencyValues }) {
        let valueToIndex = {};
        for (let [ind, item] of dependencyValues.items.entries()) {
          valueToIndex[item] = ind;
        }
        return { newValues: { valueToIndex } };
      },
    };

    stateVariableDefinitions.preliminaryValue = {
      returnDependencies: () => ({
        sliderType: {
          dependencyType: 'stateVariable',
          variableName: 'sliderType',
        },
        initialNumber: {
          dependencyType: 'stateVariable',
          variableName: 'initialNumber',
        },
        initialText: {
          dependencyType: 'stateVariable',
          variableName: 'initialText',
        },
      }),
      definition({ dependencyValues }) {
        return {
          useEssentialOrDefaultValue: {
            preliminaryValue: {
              variablesToCheck: 'value',
              get defaultValue() {
                if (dependencyValues.sliderType === 'text') {
                  return dependencyValues.initialText;
                } else {
                  return dependencyValues.initialNumber;
                }
              },
            },
          },
        };
      },
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'preliminaryValue',
              value: desiredStateVariableValues.preliminaryValue,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.index = {
      forRenderer: true,
      returnDependencies: () => ({
        sliderType: {
          dependencyType: 'stateVariable',
          variableName: 'sliderType',
        },
        valueToIndex: {
          dependencyType: 'stateVariable',
          variableName: 'valueToIndex',
        },
        items: {
          dependencyType: 'stateVariable',
          variableName: 'items',
        },
        preliminaryValue: {
          dependencyType: 'stateVariable',
          variableName: 'preliminaryValue',
        },
      }),
      definition: function ({ dependencyValues }) {
        let index = findIndexOfClosestValidValue(dependencyValues);

        //The text value might not match so choose the first item
        if (index === undefined) {
          index = 0;
        }

        return { newValues: { index } };
      },
      inverseDefinition({ desiredStateVariableValues, dependencyValues }) {
        let desiredValue =
          dependencyValues.items[desiredStateVariableValues.index];

        if (desiredValue === undefined) {
          return { success: false };
        }

        return {
          success: true,
          instructions: [
            {
              setDependency: 'preliminaryValue',
              desiredValue,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.value = {
      forRenderer: true,
      public: true,
      essential: true,
      hasVariableComponentType: true,
      returnDependencies: () => ({
        sliderType: {
          dependencyType: 'stateVariable',
          variableName: 'sliderType',
        },
        items: {
          dependencyType: 'stateVariable',
          variableName: 'items',
        },
        index: {
          dependencyType: 'stateVariable',
          variableName: 'index',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { value: dependencyValues.items[dependencyValues.index] },
          setComponentType: { value: dependencyValues.sliderType },
        };
      },
      inverseDefinition: invertSliderValue,
    };

    stateVariableDefinitions.markers = {
      forRenderer: true,
      returnDependencies: () => ({
        markersChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneMarkers',
          variableNames: ['markerType', 'markers'],
        },
        sliderType: {
          dependencyType: 'stateVariable',
          variableName: 'sliderType',
        },
        items: {
          dependencyType: 'stateVariable',
          variableName: 'items',
        },
      }),
      definition: function ({ dependencyValues }) {
        let markers = [];

        if (dependencyValues.markersChild.length === 1) {
          let markerType =
            dependencyValues.markersChild[0].stateValues.markerType;

          if (markerType === 'empty') {
            //All Ticks become markers
            markers = [...dependencyValues.items];
          } else if (markerType !== dependencyValues.sliderType) {
            //Note: no markers when they don't match and not init
            console.warn("Markers type doesn't match slider type.");
            markers = [];
          } else {
            markers = dependencyValues.markersChild[0].stateValues.markers;
          }
        }

        return { newValues: { markers } };
      },
    };

    // stateVariableDefinitions.disabled = {
    //   forRenderer: true,
    //   returnDependencies: () => ({
    //     // collaborateGroups: {
    //     //   dependencyType: "stateVariable",
    //     //   variableName: "collaborateGroups"
    //     // },
    //     // collaboration: {
    //     //   dependencyType: "flag",
    //     //   flagName: "collaboration"
    //     // }
    //   }),
    //   definition: ({ dependencyValues }) => ({
    //     newValues: {
    //       // disabled: !dependencyValues.collaborateGroups.matchGroup(dependencyValues.collaboration)
    //       disabled: false
    //     }
    //   })
    // }

    return stateVariableDefinitions;
  }

  changeValue({ value, transient }) {
    if (!this.stateValues.disabled) {
      if (transient) {
        this.coreFunctions.requestUpdate({
          updateInstructions: [
            {
              updateType: 'updateValue',
              componentName: this.componentName,
              stateVariable: 'value',
              value,
            },
          ],
          transient,
        });
      } else {
        this.coreFunctions.requestUpdate({
          updateInstructions: [
            {
              updateType: 'updateValue',
              componentName: this.componentName,
              stateVariable: 'value',
              value,
            },
          ],
          event: {
            verb: 'selected',
            object: {
              componentName: this.componentName,
              componentType: this.componentType,
            },
            result: {
              response: value,
              responseText: value.toString(),
            },
          },
        });
      }
    }
  }
}

function findIndexOfClosestValidValue({
  preliminaryValue,
  valueToIndex,
  sliderType,
  items,
}) {
  let value = preliminaryValue;

  // first check if value is actually a known value
  let matchedIndex = valueToIndex[value];
  if (matchedIndex !== undefined) {
    return matchedIndex;
  }

  // for text, we don't have a way to find the closest value
  if (sliderType === 'text') {
    return undefined;
  }

  let findNextLargerIndex = function (
    minIndex = 0,
    maxIndex = items.length - 1,
  ) {
    if (maxIndex <= minIndex + 1) {
      if (value > items[minIndex]) {
        return maxIndex;
      } else {
        return minIndex;
      }
    }
    let midIndex = Math.round((maxIndex + minIndex) / 2);
    if (value > items[midIndex]) {
      return findNextLargerIndex(midIndex, maxIndex);
    } else {
      return findNextLargerIndex(minIndex, midIndex);
    }
  };

  let closeIndex = findNextLargerIndex();
  if (closeIndex !== 0) {
    let leftValue = items[closeIndex - 1];
    let rightValue = items[closeIndex];
    let leftDist = Math.abs(value - leftValue);
    let rightDist = Math.abs(value - rightValue);
    if (leftDist < rightDist) {
      closeIndex--;
    }
  }
  return closeIndex;
}

function invertSliderValue({ desiredStateVariableValues, stateValues }) {
  // console.log(`invert slider value`)
  // console.log(desiredStateVariableValues)
  // console.log(stateValues);

  let newIndex = findIndexOfClosestValidValue({
    preliminaryValue: desiredStateVariableValues.value,
    valueToIndex: stateValues.valueToIndex,
    sliderType: stateValues.sliderType,
    items: stateValues.items,
  });

  //Text value given by another component didn't match so can't update
  if (newIndex === undefined) {
    return { success: false };
  } else {
    return {
      success: true,
      instructions: [
        {
          setDependency: 'index',
          desiredValue: newIndex,
        },
      ],
    };
  }
}
