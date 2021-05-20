import BaseComponent from './abstract/BaseComponent';
import {
  returnBreakStringsSugarFunction,
  breakEmbeddedStringsIntoParensPieces,
} from './commonsugar/breakstrings';

export class Extremum extends BaseComponent {
  static componentType = 'extremum';
  static rendererType = undefined;

  static get stateVariablesShadowedForReference() {
    return ['location', 'value'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.location = {
      createComponentOfType: 'math',
    };
    attributes.value = {
      createComponentOfType: 'math',
    };

    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakIntoLocationValueByCommas = function ({ matchedChildren }) {
      let childrenToComponentFunction = (x) => ({
        componentType: 'math',
        children: x,
      });

      let breakFunction = returnBreakStringsSugarFunction({
        childrenToComponentFunction,
        mustStripOffOuterParentheses: true,
      });

      let result = breakFunction({ matchedChildren });

      if (!result.success && matchedChildren.length === 1) {
        // if didn't succeed and just have a single string child,
        // then just wrap string with a value
        return {
          success: true,
          newAttributes: {
            value: {
              componentType: 'math',
              children: matchedChildren,
            },
          },
        };
      }

      if (result.success) {
        if (result.newChildren.length === 1) {
          // one component is a value
          return {
            success: true,
            newAttributes: {
              value: result.newChildren[0],
            },
          };
        } else if (result.newChildren.length === 2) {
          // two components is a location and value

          let locationComponent = result.newChildren[0];
          let valueComponent = result.newChildren[1];

          let newAttributes = {
            location: locationComponent,
            value: valueComponent,
          };

          // remove components that are empty
          if (
            locationComponent.children.length === 0 ||
            (locationComponent.children.length === 1 &&
              locationComponent.children[0].componentType === 'string' &&
              locationComponent.children[0].state.value.trim() === '')
          ) {
            delete newAttributes.location;
          }

          if (
            valueComponent.children.length === 0 ||
            (valueComponent.children.length === 1 &&
              valueComponent.children[0].componentType === 'string' &&
              valueComponent.children[0].state.value.trim() === '')
          ) {
            delete newAttributes.value;
          }

          return {
            success: true,
            newAttributes,
          };
        } else {
          return { success: false };
        }
      }

      return result;
    };

    sugarInstructions.push({
      childrenRegex: /s+(.*s)?/,
      replacementFunction: breakIntoLocationValueByCommas,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atMostOnePoint',
      componentType: 'point',
      comparison: 'atMost',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions({ numerics }) {
    let stateVariableDefinitions = super.returnStateVariableDefinitions({
      numerics,
    });

    let componentClass = this;

    stateVariableDefinitions.value = {
      public: true,
      componentType: 'math',
      defaultValue: null,
      additionalStateVariablesDefined: [
        {
          variableName: 'location',
          public: true,
          componentType: 'math',
          defaultValue: null,
        },
      ],
      returnDependencies: () => ({
        extremumChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOnePoint',
          variableNames: ['nDimensions', 'xs'],
        },
        location: {
          dependencyType: 'attributeComponent',
          attributeName: 'location',
          variableNames: ['value'],
        },
        value: {
          dependencyType: 'attributeComponent',
          attributeName: 'value',
          variableNames: ['value'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let location, value;

        if (dependencyValues.extremumChild.length === 1) {
          let extremumChild = dependencyValues.extremumChild[0];
          if (extremumChild.stateValues.nDimensions !== 2) {
            console.log(
              'Cannot determine ' +
                componentClass.componentType +
                " from a point that isn't 2D",
            );
            location = null;
            value = null;
          } else {
            location = extremumChild.stateValues.xs[0];
            value = extremumChild.stateValues.xs[1];
          }
        } else {
          if (dependencyValues.location !== null) {
            location = dependencyValues.location.stateValues.value;
          }
          if (dependencyValues.value !== null) {
            value = dependencyValues.value.stateValues.value;
          }
        }

        let newValues = {};
        let useEssentialOrDefaultValue = {};
        let haveNewValues = false;
        let haveEssential = false;
        if (location === undefined) {
          useEssentialOrDefaultValue.location = {
            variablesToCheck: ['location'],
          };
          haveEssential = true;
        } else {
          newValues.location = location;
          haveNewValues = true;
        }

        if (value === undefined) {
          useEssentialOrDefaultValue.value = { variablesToCheck: ['value'] };
          haveEssential = true;
        } else {
          newValues.value = value;
          haveNewValues = true;
        }

        let result = {};
        if (haveNewValues) {
          result.newValues = newValues;
        }
        if (haveEssential) {
          result.useEssentialOrDefaultValue = useEssentialOrDefaultValue;
        }

        return result;
      },
    };

    return stateVariableDefinitions;
  }
}

// export class Maximum extends Extremum {
//   static componentType = "maximum";
// }

// export class Minimum extends Extremum {
//   static componentType = "minimum";
// }

export class Extrema extends BaseComponent {
  static componentType = 'extrema';
  static rendererType = undefined;
  static componentTypeSingular = 'extremum';
  static get componentTypeCapitalized() {
    return (
      this.componentType.charAt(0).toUpperCase() + this.componentType.slice(1)
    );
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();
    let extremaClass = this;

    let createExtremumList = function ({ matchedChildren }) {
      let results = breakEmbeddedStringsIntoParensPieces({
        componentList: matchedChildren,
      });

      if (results.success !== true) {
        return { success: false };
      }

      return {
        success: true,
        newChildren: results.pieces.map(function (piece) {
          if (piece.length > 1 || piece[0].componentType === 'string') {
            return {
              componentType: extremaClass.componentTypeSingular,
              children: piece,
            };
          } else {
            return piece[0];
          }
        }),
      };
    };

    sugarInstructions.push({
      // childrenRegex: /s+(.*s)?/,
      replacementFunction: createExtremumList,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroExtrema = childLogic.newLeaf({
      name: 'atLeastZeroExtrema',
      componentType: this.componentTypeSingular,
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroPoints = childLogic.newLeaf({
      name: 'atLeastZeroPoints',
      componentType: 'point',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'extremaAndPoints',
      operator: 'and',
      propositions: [atLeastZeroExtrema, atLeastZeroPoints],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();
    let extremaClass = this;

    stateVariableDefinitions['n' + extremaClass.componentTypeCapitalized] = {
      additionalStateVariablesDefined: ['childIdentities'],
      returnDependencies: () => ({
        children: {
          dependencyType: 'child',
          childLogicName: 'extremaAndPoints',
        },
      }),
      definition: function ({ dependencyValues }) {
        let extremeVarName = 'n' + extremaClass.componentTypeCapitalized;
        return {
          newValues: {
            [extremeVarName]: dependencyValues.children.length,
            childIdentities: dependencyValues.children,
          },
        };
      },
    };

    stateVariableDefinitions[extremaClass.componentType] = {
      isArray: true,
      nDimensions: 2,
      entryPrefixes: [
        extremaClass.componentTypeSingular,
        extremaClass.componentTypeSingular + 'Locations',
        extremaClass.componentTypeSingular + 'Location',
        extremaClass.componentTypeSingular + 'Values',
        extremaClass.componentTypeSingular + 'Value',
      ],
      stateVariablesDeterminingDependencies: ['childIdentities'],
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (
          [
            extremaClass.componentTypeSingular,
            extremaClass.componentTypeSingular + 'Location',
            extremaClass.componentTypeSingular + 'Value',
          ].includes(arrayEntryPrefix)
        ) {
          let extremumInd = Number(varEnding) - 1;
          if (Number.isInteger(extremumInd) && extremumInd >= 0) {
            // if don't know array size, just guess that the entry is OK
            // It will get corrected once array size is known.
            // TODO: better to return empty array?
            if (!arraySize || extremumInd < arraySize[0]) {
              if (arrayEntryPrefix === extremaClass.componentTypeSingular) {
                return [extremumInd + ',0', extremumInd + ',1'];
              } else if (
                arrayEntryPrefix ===
                extremaClass.componentTypeSingular + 'Location'
              ) {
                return [extremumInd + ',0'];
              } else {
                return [extremumInd + ',1'];
              }
            } else {
              return [];
            }
          } else {
            return [];
          }
        } else if (
          arrayEntryPrefix ===
          extremaClass.componentTypeSingular + 'Locations'
        ) {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,0"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',0');
        } else if (
          arrayEntryPrefix ===
          extremaClass.componentTypeSingular + 'Values'
        ) {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,1"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',1');
        } else {
          return [];
        }
      },
      arrayVarNameFromArrayKey(arrayKey) {
        let [ind1, ind2] = arrayKey.split(',');

        if (ind2 === '0') {
          return (
            extremaClass.componentTypeSingular + 'Location' + (Number(ind1) + 1)
          );
        } else {
          return (
            extremaClass.componentTypeSingular + 'Value' + (Number(ind1) + 1)
          );
        }
      },
      returnArraySizeDependencies: () => ({
        nChildren: {
          dependencyType: 'stateVariable',
          variableName: 'n' + extremaClass.componentTypeCapitalized,
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nChildren, 2];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let [extremumInd, dim] = arrayKey.split(',');
          let varName;
          if (
            stateValues.childIdentities[extremumInd].componentType ===
            extremaClass.componentTypeSingular
          ) {
            varName = Number(dim) === 0 ? 'location' : 'value';
          } else {
            varName = 'x' + (Number(dim) + 1);
          }
          dependenciesByKey[arrayKey] = {
            child: {
              dependencyType: 'child',
              childLogicName: 'extremaAndPoints',
              variableNames: [varName],
              childIndices: [extremumInd],
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log(`array definition of ${extremaClass.componentType} for ${extremaClass.componentType}`)
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))
        // console.log(arrayKeys);

        let extrema = {};

        for (let arrayKey of arrayKeys) {
          let child = dependencyValuesByKey[arrayKey].child[0];
          if (child) {
            let dim = arrayKey.split(',')[1];
            let varName = Number(dim) === 0 ? 'location' : 'value';
            if (varName in child.stateValues) {
              extrema[arrayKey] = child.stateValues[varName];
            } else {
              extrema[arrayKey] = child.stateValues['x' + (Number(dim) + 1)];
            }
          }
        }

        return { newValues: { [extremaClass.componentType]: extrema } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
      }) {
        // console.log('array inverse definition of points of pointlist')
        // console.log(desiredStateVariableValues)
        // console.log(arrayKeys);

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues[
          extremaClass.componentType
        ]) {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].extremumChild,
            desiredValue:
              desiredStateVariableValues[extremaClass.componentType][arrayKey],
            childIndex: 0,
            variableIndex: 0,
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    return stateVariableDefinitions;
  }
}

// export class Maxima extends Extrema {
//   static componentType = "maxima";
//   static componentTypeSingular = "maximum"
// }

// export class Minima extends Extrema {
//   static componentType = "minima";
//   static componentTypeSingular = "minimum"
// }
