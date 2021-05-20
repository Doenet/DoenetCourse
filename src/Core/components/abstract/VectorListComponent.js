import BaseComponent from './BaseComponent';
import { breakEmbeddedStringsIntoParensPieces } from '../commonsugar/breakstrings';

export default class VectorListComponent extends BaseComponent {
  static componentType = '_vectorListComponent';
  static rendererType = 'container';
  static renderChildren = true;

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let createVectorList = function ({ matchedChildren }) {
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
              componentType: 'vector',
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
      replacementFunction: createVectorList,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroVectors',
      componentType: 'vector',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nVectors = {
      returnDependencies: () => ({
        vectorChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroVectors',
          skipComponentNames: true,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { nVectors: dependencyValues.vectorChildren.length },
        checkForActualChange: { nVectors: true },
      }),
    };

    stateVariableDefinitions.nDimensions = {
      returnDependencies: () => ({
        vectorChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroVectors',
          variableNames: ['nDimensions'],
          skipPlaceholders: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        let nDimensions;

        if (dependencyValues.vectorChildren.length === 0) {
          nDimensions = 2;
        } else {
          nDimensions = 1;
          for (let vector of dependencyValues.vectorChildren) {
            if (Number.isFinite(vector.stateValues.nDimensions)) {
              nDimensions = Math.max(
                nDimensions,
                vector.stateValues.nDimensions,
              );
            }
          }
        }
        return {
          newValues: { nDimensions },
          checkForActualChange: { nDimensions: true },
        };
      },
    };

    stateVariableDefinitions.vectors = {
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['vectorX', 'vector'],
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'vectorX') {
          // vectorX1_2 is the 2nd component of the first vector
          let indices = varEnding.split('_').map((x) => Number(x) - 1);
          if (
            indices.length === 2 &&
            indices.every((x, i) => Number.isInteger(x) && x >= 0)
          ) {
            if (arraySize) {
              if (indices.every((x, i) => x < arraySize[i])) {
                return [String(indices)];
              } else {
                return [];
              }
            } else {
              // if don't know array size, just guess that the entry is OK
              // It will get corrected once array size is known.
              // TODO: better to return empty array?
              return [String(indices)];
            }
          } else {
            return [];
          }
        } else {
          // vector3 is all components of the third vector
          let vectorInd = Number(varEnding) - 1;
          if (!arraySize) {
            return [];
          }
          if (
            Number.isInteger(vectorInd) &&
            vectorInd >= 0 &&
            vectorInd < arraySize[0]
          ) {
            // array of "vectorInd,i", where i=0, ..., arraySize[1]-1
            return Array.from(
              Array(arraySize[1]),
              (_, i) => vectorInd + ',' + i,
            );
          } else {
            return [];
          }
        }
      },
      returnArraySizeDependencies: () => ({
        nVectors: {
          dependencyType: 'stateVariable',
          variableName: 'nVectors',
        },
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nVectors, dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let [vectorInd, dim] = arrayKey.split(',');
          dependenciesByKey[arrayKey] = {
            vectorChild: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroVectors',
              variableNames: ['x' + (Number(dim) + 1)],
              childIndices: [vectorInd],
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log('array definition of vectors for vectorlist')
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))
        // console.log(arrayKeys);

        let vectors = {};

        for (let arrayKey of arrayKeys) {
          let dim = arrayKey.split(',')[1];

          let vectorChild = dependencyValuesByKey[arrayKey].vectorChild[0];
          if (vectorChild) {
            vectors[arrayKey] =
              vectorChild.stateValues['x' + (Number(dim) + 1)];
          }
        }

        return { newValues: { vectors } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        // componentName
      }) {
        // console.log(`array inverse definition of vectors of vectorlist of ${componentName}`)
        // console.log(desiredStateVariableValues)
        // console.log(arrayKeys);

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.vectors) {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].vectorChild,
            desiredValue: desiredStateVariableValues.vectors[arrayKey],
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
